import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import ora from 'ora';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);

function cpuAverage() {
    let totalIdle = 0, totalTick = 0;
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) {
        return { idle: 0, total: 0 };
    }
    for (let i = 0, len = cpus.length; i < len; i++) {
        const cpu = cpus[i];
        for (const type in cpu.times) {
            totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
    }
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

function getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
        const startMeasure = cpuAverage();
        setTimeout(() => {
            const endMeasure = cpuAverage();
            const idleDifference = endMeasure.idle - startMeasure.idle;
            const totalDifference = endMeasure.total - startMeasure.total;
            if (totalDifference === 0) {
                resolve(0);
                return;
            }
            const percentageCPU = 100 - Math.round(100 * idleDifference / totalDifference);
            resolve(percentageCPU);
        }, 1000);
    });
}

async function getDiskUsage(): Promise<string> {
    try {
        const { stdout } = await execAsync("df / | tail -1");
        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 5) {
            const usePercent = parts[4];
            if (usePercent.endsWith('%')) {
                return usePercent;
            }
        }
        return 'N/A';
    } catch (e) {
        return 'N/A';
    }
}

export class AeroAgent {
    private socket: Socket | null = null;
    private readonly apiUrl: string;
    private readonly token: string;

    constructor(token: string, apiUrl: string = 'https://aero-y6mm.onrender.com') {
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

        const heartbeatInterval = setInterval(async () => {
            if (this.socket && this.socket.connected) {
                const cpu = await getCPUUsage();
                const disk = await getDiskUsage();
                const total = os.totalmem();
                const free = os.freemem();
                const memory = total > 0 ? Math.round(((total - free) / total) * 100) : 0;

                this.socket.emit('ping', { 
                    status: 'online', 
                    uptime: process.uptime(),
                    freemem: free,
                    totalmem: total,
                    loadavg: os.loadavg(),
                    cpu,
                    memory,
                    disk
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

        this.socket.on('cmd_terminal_start', (payload) => {
            this.handleTerminalStart(payload.sessionId);
        });

        this.socket.on('cmd_terminal_input', (payload) => {
            this.handleTerminalInput(payload.sessionId, payload.input);
        });

        this.socket.on('cmd_terminal_stop', (payload) => {
            this.handleTerminalStop(payload.sessionId);
        });

        this.startCrashMonitor();
        this.startHealthChecker();
    }

    private crashRestartCounts = new Map<string, number>();

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
                            this.socket.emit('service_crashed', { serviceId, containerName, exitCode });
                        }

                        // Auto-restart: honor Docker's --restart policy but also track count
                        const count = (this.crashRestartCounts.get(serviceId) || 0) + 1;
                        this.crashRestartCounts.set(serviceId, count);

                        if (count <= 5) {
                            console.log(chalk.yellow(`[AUTO_RESTART] Restarting ${containerName} (attempt ${count}/5)...`));
                            execAsync(`docker start ${containerName}`).catch(() => {
                                console.log(chalk.red(`[AUTO_RESTART] Failed to restart ${containerName}`));
                            });
                        } else {
                            console.log(chalk.red(`[AUTO_RESTART] Service ${serviceId} exceeded max restarts (5). Giving up.`));
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

    /**
     * Periodically run health checks on managed containers and report status.
     */
    private startHealthChecker() {
        setInterval(async () => {
            try {
                const { stdout } = await execAsync('docker ps -q --filter "label=aero.managed=true"');
                const ids = stdout.trim().split('\n').filter(id => id.length > 0);

                for (const containerId of ids) {
                    try {
                        const { stdout: inspectOut } = await execAsync(`docker inspect --format="{{json .State.Health}}" ${containerId}`);
                        const health = JSON.parse(inspectOut.trim());

                        if (health && health.Status && health.Status !== 'healthy') {
                            const { stdout: labelOut } = await execAsync(`docker inspect --format="{{index .Config.Labels \"aero.service.id\"}}" ${containerId}`);
                            const serviceId = labelOut.trim();

                            if (serviceId && this.socket) {
                                this.socket.emit('health_check_result', {
                                    serviceId,
                                    containerId,
                                    status: health.Status,
                                    failingStreak: health.FailingStreak || 0,
                                });
                            }
                        }
                    } catch {
                        // Container may not have health check configured — skip
                    }
                }
            } catch {
                // docker ps failed — skip this cycle
            }
        }, 30000); // Check every 30 seconds
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

            // Resource limits
            let resourceArgs = '';
            if (service.resource_limits) {
                const limits = typeof service.resource_limits === 'string' ? JSON.parse(service.resource_limits) : service.resource_limits;
                if (limits.memory) resourceArgs += ` --memory=${limits.memory}`;
                if (limits.cpu) resourceArgs += ` --cpus=${limits.cpu}`;
            }

            // Health check from service config
            let healthArgs = '';
            if (service.health_check) {
                const hc = typeof service.health_check === 'string' ? JSON.parse(service.health_check) : service.health_check;
                if (hc.command) {
                    healthArgs += ` --health-cmd="${hc.command}"`;
                    if (hc.interval) healthArgs += ` --health-interval=${hc.interval}`;
                    if (hc.timeout) healthArgs += ` --health-timeout=${hc.timeout}`;
                    if (hc.retries) healthArgs += ` --health-retries=${hc.retries}`;
                }
            }

            // Variables are now decrypted by the API before being sent to the agent payload!
            const envArgs = service.variables ? service.variables.map((v: any) => `-e ${v.key}="${v.value || ''}"`).join(' ') : '';
            
            const startCmd = `docker run -d --name ${containerName} --network ${networkName} --restart unless-stopped -p ${internalPort} ${labelsStr} ${volumesArgs} ${envArgs}${resourceArgs}${healthArgs} ${imageTag}`;
            
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
        for (const [id, child] of this.activeTerminals) {
            child.kill();
        }
    }

    private activeTerminals = new Map<string, ReturnType<typeof spawn>>();

    private handleTerminalStart(sessionId: string) {
        console.log(chalk.cyan(`[TERMINAL] Session ${sessionId} started.`));
        const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
        const args = os.platform() === 'win32' ? [] : ['--noprofile', '--norc', '-i'];
        
        const child = spawn(shell, args, {
            env: { ...process.env, PS1: '\\u@\\h:~$ ' },
        });

        this.activeTerminals.set(sessionId, child);

        child.stdout?.on('data', (data) => {
            if (this.socket) {
                this.socket.emit('terminal_output', { sessionId, output: data.toString() });
            }
        });

        child.stderr?.on('data', (data) => {
            if (this.socket) {
                this.socket.emit('terminal_output', { sessionId, output: data.toString() });
            }
        });

        child.on('close', () => {
            console.log(chalk.cyan(`[TERMINAL] Session ${sessionId} closed.`));
            this.activeTerminals.delete(sessionId);
        });
    }

    private handleTerminalInput(sessionId: string, input: string) {
        const child = this.activeTerminals.get(sessionId);
        if (child && child.stdin) {
            child.stdin.write(input);
        }
    }

    private handleTerminalStop(sessionId: string) {
        const child = this.activeTerminals.get(sessionId);
        if (child) {
            child.kill();
            this.activeTerminals.delete(sessionId);
        }
    }
}
