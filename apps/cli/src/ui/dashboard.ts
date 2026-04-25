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

  // The Infinite Loop: This keeps the CLI running and returning to the menu
  while (true) {
    const isLoggedIn = !!cliState.token; // Check if we have a token saved
    
    // 1. Build the menu dynamically based on auth state
    const options = [];

    if (!isLoggedIn) {
      options.push({ value: 'login', label: unicode ? '🔑 Login to Aero' : '> Login to Aero' });
    } else {
      options.push({ value: 'deploy', label: unicode ? '🚀 Deploy a Service' : '> Deploy a Service' });
      options.push({ value: 'chat', label: unicode ? '💬 Chat with Aero Assistant' : '> Chat with Aero Assistant' });
      options.push({ value: 'logs', label: unicode ? '📄 View Deployment Logs' : '> View Deployment Logs' });
      options.push({ value: 'logout', label: unicode ? '🚪 Logout' : '> Logout' }); // Added a logout option!
    }

    // Exit is always available
    options.push({ value: 'exit', label: unicode ? '❌ Exit' : '> Exit' });

    // 2. Show the prompt
    const task = await p.select({
      message: 'What would you like to do?',
      options: options,
    });

    // Handle exits immediately
    if (p.isCancel(task) || task === 'exit') {
      p.outro(chalk.gray('Goodbye!'));
      process.exit(0);
    }

    // 3. Execute the selected task
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
          cliState.token = null; // Destroy the session token
          p.log.success('Logged out successfully.');
          break;
      }
    } catch (error) {
      // We log the error, but we DO NOT exit the process. 
      // The loop will just restart and show the menu again.
      p.outro(chalk.red('An error occurred during the operation.'));
      console.error(error);
    }
  }
}