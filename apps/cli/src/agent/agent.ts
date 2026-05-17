import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import ora from 'ora';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);

export class AeroAgent {
    private socket: Socket | null = null;
    private readonly apiUrl: string;
    private readonly token: string;

    constructor(token: string, apiUrl: string = 'http://localhost:3500') {
        this.token = token;
        this.apiUrl = apiUrl;
    }

    public start() {
        const spinner = ora('Connecting to Aero Control Plane...').start();

        this.socket = io(`${this.apiUrl}/agent`, {
            auth: { token: this.token },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        const heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping', { 
                    status: 'online', 
                    uptime: process.uptime(),
                    freemem: os.freemem(),
                    totalmem: os.totalmem(),
                    loadavg: os.loadavg()
                });
            }
        }, 30000);

        this.socket.on('connect', () => {
            spinner.succeed(chalk.green(`Connected to Aero Control Plane successfully!`));
            console.log(chalk.blue(`[INFO] Agent is running and waiting for deployment commands.`));
            console.log(chalk.gray(`Press Ctrl+C to stop the daemon.`));
        });

        this.socket.on('connect_error', (error) => {
            spinner.fail(chalk.red(`Failed to connect: ${error.message}`));
            console.log(chalk.yellow(`[WARN] Retrying connection in the background...`));
        });

        this.socket.on('disconnect', (reason) => {
            console.log(chalk.red(`\n[DISCONNECT] Connection lost: ${reason}`));
        });

        // Handle commands from the Control Plane
        this.socket.on('cmd_deploy', (payload) => {
            this.handleDeployCommand(payload);
        });

        this.socket.on('cmd_service_stop', async (payload) => {
            await this.handleServiceControl('stop', payload.serviceId);
        });

        this.socket.on('cmd_service_start', async (payload) => {
            await this.handleServiceControl('start', payload.serviceId);
        });

        this.socket.on('cmd_service_restart', async (payload) => {
            await this.handleServiceControl('restart', payload.serviceId);
        });

        this.socket.on('cmd_service_delete', async (payload) => {
            await this.handleServiceControl('delete', payload.serviceId);
        });

        this.startCrashMonitor();
    }

    private startCrashMonitor() {
        const child = spawn('docker', ['events', '--filter', 'event=die', '--filter', 'label=aero.managed=true', '--format', '{{json .}}']);

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    const serviceId = event.Actor?.Attributes?.['aero.service.id'];
                    const containerName = event.Actor?.Attributes?.name;
                    const exitCode = event.Actor?.Attributes?.exitCode;
                    
                    if (serviceId && exitCode !== "0" && exitCode !== "143" && exitCode !== "137") {
                        console.log(chalk.red(`[CRASH_DETECTED] Service ${serviceId} (container ${containerName}) crashed with exit code ${exitCode}`));
                        if (this.socket) {
                            this.socket.emit('service_crashed', {
                                serviceId,
                                containerName,
                                exitCode
                            });
                        }
                    }
                } catch(e) {
                    // Ignore parse error
                }
            }
        });

        child.on('close', () => {
            console.log(chalk.yellow('[WARN] Crash monitor disconnected. Restarting...'));
            setTimeout(() => this.startCrashMonitor(), 5000);
        });
    }

    private async handleServiceControl(action: 'stop' | 'start' | 'restart' | 'delete', serviceId: string) {
        console.log(chalk.cyan(`\n[CMD_RECEIVED] Received ${action} instruction for service ${serviceId}`));
        
        try {
            // Find container by label aero.service.id
            const { stdout } = await execAsync(`docker ps -a -q --filter "label=aero.service.id=${serviceId}"`);
            const containerIds = stdout.trim().split('\n').filter(id => id.length > 0);
            
            if (containerIds.length === 0) {
                console.log(chalk.yellow(`[WARN] No containers found for service ${serviceId}`));
                return;
            }

            for (const id of containerIds) {
                if (action === 'delete') {
                    console.log(chalk.gray(`> Forcibly removing container ${id}...`));
                    await execAsync(`docker rm -f ${id}`);
                } else {
                    console.log(chalk.gray(`> Executing 'docker ${action} ${id}'...`));
                    await execAsync(`docker ${action} ${id}`);
                }
            }
            console.log(chalk.green(`[SUCCESS] Service ${serviceId} successfully ${action}ed.`));
        } catch (error: any) {
             console.log(chalk.red(`[ERROR] Failed to ${action} service ${serviceId}: ${error.message}`));
        }
    }

    private emitLog(deploymentId: string, phase: string, message: string, level: string = 'info') {
        if (this.socket) {
            this.socket.emit('deploy_log', {
                deploymentId,
                phase,
                message,
                level
            });
        }
    }

    private async runCommandStream(command: string, args: string[], cwd: string, deploymentId: string, phase: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, { cwd, shell: true });
            
            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
                for (const line of lines) {
                    console.log(chalk.gray(`      ${line}`));
                    this.emitLog(deploymentId, phase, line);
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
                for (const line of lines) {
                    console.log(chalk.yellow(`      ${line}`));
                    this.emitLog(deploymentId, phase, line, 'warn');
                }
            });

            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Command ${command} exited with code ${code}`));
            });
        });
    }

    private async handleDeployCommand(payload: any) {
        console.log(chalk.cyan(`\n[CMD_RECEIVED] Received deployment instruction:`));
        
        const { service, deploymentJob } = payload;
        const deploymentId = deploymentJob.deploymentId;

        this.emitLog(deploymentId, 'routing', `Agent received deployment instruction for service ${service.name}`);

        try {
            const containerName = `aero-svc-${service.slug}`;
            const internalPort = service.internal_port || 3000;
            
            console.log(chalk.blue(`[DEPLOY] Starting deployment for ${service.name}...`));
            this.emitLog(deploymentId, 'build', `Starting deployment on agent...`);

            let imageTag = '';

            if (service.source_type === 'GITHUB' || service.source_type === 'git') {
                const gitUrl = deploymentJob.gitUrl;
                const branch = deploymentJob.branch || 'main';
                imageTag = `aero-local/${service.slug}:${deploymentJob.commitSha || 'latest'}`;
                
                const cloneDir = path.join(os.tmpdir(), `aero-${service.slug}-${Date.now()}`);
                
                console.log(chalk.gray(`> Cloning ${gitUrl} (branch: ${branch}) into ${cloneDir}`));
                this.emitLog(deploymentId, 'clone', `Cloning ${gitUrl} (branch: ${branch})`);
                await execAsync(`git clone -b ${branch} ${gitUrl} ${cloneDir}`);

                console.log(chalk.gray(`> Building Docker image ${imageTag}...`));
                this.emitLog(deploymentId, 'build', `Building Docker image ${imageTag}...`);
                const hasDockerfile = await fs.access(path.join(cloneDir, 'Dockerfile')).then(() => true).catch(() => false);
                
                if (hasDockerfile) {
                    await this.runCommandStream('docker', ['build', '-t', imageTag, '.'], cloneDir, deploymentId, 'build');
                } else if (service.build_command) {
                    const mvpDockerfile = `
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN ${service.build_command}
CMD ${service.start_command || 'npm start'}
`;
                    await fs.writeFile(path.join(cloneDir, 'Dockerfile'), mvpDockerfile);
                    await this.runCommandStream('docker', ['build', '-t', imageTag, '.'], cloneDir, deploymentId, 'build');
                } else {
                    throw new Error("No Dockerfile or build_command specified.");
                }

                // Cleanup
                await execAsync(`rm -rf ${cloneDir}`);

            } else {
                imageTag = service.docker_image;
                console.log(chalk.gray(`> Pulling Docker image ${imageTag}...`));
                this.emitLog(deploymentId, 'build', `Pulling Docker image ${imageTag}...`);
                await this.runCommandStream('docker', ['pull', imageTag], process.cwd(), deploymentId, 'build');
            }

            console.log(chalk.gray(`> Cleaning up old container if exists...`));
            this.emitLog(deploymentId, 'deploy', `Cleaning up old container if exists...`);
            try {
                await execAsync(`docker rm -f ${containerName}`);
            } catch (e) {
                // Ignore
            }

            console.log(chalk.gray(`> Setting up project network...`));
            const networkName = `aero-net-${service.project_id}`;
            try {
                await execAsync(`docker network create ${networkName}`);
            } catch (e) {
                // Ignore if network already exists
            }

            let volumesArgs = '';
            if (service.volumes && Array.isArray(service.volumes) && service.volumes.length > 0) {
                console.log(chalk.gray(`> Setting up persistent volumes...`));
                for (const v of service.volumes) {
                    const volName = `aero-vol-${v.id}`;
                    try {
                        await execAsync(`docker volume create ${volName}`);
                    } catch (e) {} // Ignore if volume exists
                }
                volumesArgs = service.volumes.map((v: any) => `-v aero-vol-${v.id}:${v.mount_path}`).join(' ');
            }

            console.log(chalk.gray(`> Starting container ${containerName}...`));
            this.emitLog(deploymentId, 'deploy', `Starting container ${containerName}...`);
            
            let hostRules = `Host(\`${service.slug}.localhost\`)`;
            let useTls = false;
            
            if (service.domains && Array.isArray(service.domains) && service.domains.length > 0) {
                const hosts = service.domains.map((d: any) => `Host(\`${d.domain}\`)`);
                hostRules = hosts.join(' || ');
                useTls = service.domains.some((d: any) => !d.domain.endsWith('.localhost'));
            }

            const labels = [
                `--label "traefik.enable=true"`,
                `--label "traefik.docker.network=${networkName}"`,
                `--label "traefik.http.routers.${service.slug}.rule=${hostRules}"`,
                `--label "traefik.http.services.${service.slug}.loadbalancer.server.port=${internalPort}"`,
                `--label "aero.managed=true"`,
                `--label "aero.service.id=${service.id}"`,
                `--label "aero.project.id=${service.project_id}"`
            ];

            if (useTls) {
                labels.push(`--label "traefik.http.routers.${service.slug}.tls.certresolver=letsencrypt"`);
            }
            
            const labelsStr = labels.join(' ');

            // Variables are now decrypted by the API before being sent to the agent payload!
            const envArgs = service.variables ? service.variables.map((v: any) => `-e ${v.key}="${v.value || ''}"`).join(' ') : '';
            
            const startCmd = `docker run -d --name ${containerName} --network ${networkName} --restart unless-stopped -p ${internalPort} ${labelsStr} ${volumesArgs} ${envArgs} ${imageTag}`;
            
            await execAsync(startCmd);

            console.log(chalk.green(`\n[SUCCESS] ${service.name} is now running on your device!`));
            console.log(chalk.green(`          Container: ${containerName}`));
            console.log(chalk.green(`          Local Access: http://${service.slug}.localhost (if Traefik is running)`));

            if (this.socket) {
                this.socket.emit('ping', { status: 'running', service_id: service.id, container: containerName });
                this.socket.emit('deploy_status', {
                    deploymentId,
                    status: 'completed',
                    containerId: containerName,
                    imageTag
                });
                this.emitLog(deploymentId, 'completed', 'Deployment successful');
            }

        } catch (error: any) {
            console.log(chalk.red(`[ERROR] Deployment failed: ${error.message}`));
            if (this.socket) {
                this.emitLog(deploymentId, 'failed', `Deployment failed: ${error.message}`, 'error');
                this.socket.emit('deploy_status', {
                    deploymentId,
                    status: 'failed'
                });
            }
        }
    }

    public stop() {
        if (this.socket) {
            this.socket.disconnect();
            console.log(chalk.yellow('Agent disconnected from Control Plane.'));
        }
    }
}
