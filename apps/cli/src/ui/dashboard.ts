import * as p from '@clack/prompts';
import chalk from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';

// Import your actions and state
import { loginAction } from '../commands/login.js';
import { deployAction } from '../commands/deploy.js';
import { chatAction } from '../commands/chat.js';
import { logsAction } from '../commands/logs.js';
import { cliState } from '../api/api.js'; // Make sure to import your state!

const unicode = isUnicodeSupported();

export async function startInteractiveDashboard() {
  console.clear();
  p.intro(`${chalk.bgBlue.cyan(' AERO ')} ${chalk.cyan('Self-Hosted Cloud Platform - Version 0.1.0')}`);
  while (true) {
    const isLoggedIn = !!cliState.token;

    const options = [];

    if (!isLoggedIn) {
      options.push({ value: 'login', label: unicode ? '🔑 Login to Aero' : '> Login to Aero' });
    } else {
      options.push({ value: 'deploy', label: unicode ? '🚀 Deploy a Service' : '> Deploy a Service' });
      options.push({ value: 'chat', label: unicode ? '💬 Chat with Aero Assistant' : '> Chat with Aero Assistant' });
      options.push({ value: 'logs', label: unicode ? '📄 View Deployment Logs' : '> View Deployment Logs' });
      options.push({ value: 'logout', label: unicode ? '🚪 Logout' : '> Logout' }); // Added a logout option!
    }
    options.push({ value: 'exit', label: unicode ? '❌ Exit' : '> Exit' });

    const task = await p.select({
      message: 'What would you like to do?',
      options: options,
    });

    if (p.isCancel(task) || task === 'exit') {
      p.outro(chalk.gray('Goodbye!'));
      process.exit(0);
    }

    try {
      switch (task) {
        case 'login':
          await loginAction();
          break;
        case 'deploy':
          await deployAction();
          break;
        case 'chat':
          await chatAction();
          break;
        case 'logs':
          await logsAction();
          break;
        case 'logout':
          cliState.token = null;
          p.log.success('Logged out successfully.');
          break;
      }
    } catch (error) {
      p.outro(chalk.red('An error occurred during the operation.'));
      console.error(error);
    }
  }
}