import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import ora from 'ora';

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

    private handleDeployCommand(payload: any) {
        console.log(chalk.cyan(`\n[CMD_RECEIVED] Received deployment instruction:`));
        console.log(chalk.gray(JSON.stringify(payload, null, 2)));

        // MVP: Prove connection works by mocking execution
        console.log(chalk.green(`[ACTION] Mocking deployment execution for payload...`));

        // Simulate a heartbeat to the API
        if (this.socket) {
            this.socket.emit('ping', { status: 'deploying', mock_cpu: '45%' });
        }
    }

    public stop() {
        if (this.socket) {
            this.socket.disconnect();
            console.log(chalk.yellow('Agent disconnected from Control Plane.'));
        }
    }
}
