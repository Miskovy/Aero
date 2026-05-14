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

            console.log(chalk.gray(`> Starting container ${containerName}...`));
            this.emitLog(deploymentId, 'deploy', `Starting container ${containerName}...`);
            
            const labels = [
                `--label "traefik.enable=true"`,
                `--label "traefik.http.routers.${service.slug}.rule=Host(\`${service.slug}.localhost\`)"`,
                `--label "traefik.http.services.${service.slug}.loadbalancer.server.port=${internalPort}"`,
                `--label "aero.managed=true"`,
                `--label "aero.service.id=${service.id}"`
            ].join(' ');

            const envArgs = service.variables ? service.variables.map((v: any) => `-e ${v.key}="[ENCRYPTED_ON_API]"`).join(' ') : '';
            
            const startCmd = `docker run -d --name ${containerName} --restart unless-stopped -p ${internalPort} ${labels} ${envArgs} ${imageTag}`;
            
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
