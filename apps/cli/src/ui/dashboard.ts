import * as p from '@clack/prompts';
import chalk from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';
import { loginAction } from '../commands/login.js';
import { deployAction } from '../commands/deploy.js';
import { chatAction } from '../commands/chat.js';
import { logsAction } from '../commands/logs.js';

const unicode = isUnicodeSupported();

export async function startInteractiveDashboard() {
  console.clear();
  p.intro(`${chalk.bgBlue.cyan(' AERO ')} ${chalk.cyan('Self-Hosted Cloud Platform')}`);

  const task = await p.select({
    message: 'What would you like to do?',
    options: [
      { value: 'login', label: unicode ? '🔑 Login to Aero' : '> Login to Aero' },
      { value: 'deploy', label: unicode ? '🚀 Deploy a Service' : '> Deploy a Service' },
      { value: 'chat', label: unicode ? '💬 Chat with Aero Assistant' : '> Chat with Aero Assistant' },
      { value: 'logs', label: unicode ? '📄 View Deployment Logs' : '> View Deployment Logs' },
      { value: 'exit', label: unicode ? '❌ Exit' : '> Exit' }
    ],
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
        p.outro('Starting assistant...');
        await chatAction();
        break;
      case 'logs':
        p.outro('Fetching logs...');
        await logsAction();
        break;
    }
  } catch (error) {
    p.outro(chalk.red('An error occurred during the operation.'));
    console.error(error);
    process.exit(1);
  }
}
