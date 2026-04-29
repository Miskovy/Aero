import * as p from '@clack/prompts';
import chalk from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';

import { loginAction, githubLoginAction, registerAction } from '../commands/login.js';
import { deployAction } from '../commands/deploy.js';
import { chatAction } from '../commands/chat.js';
import { logsAction } from '../commands/logs.js';
import { createAction } from '../commands/create.js';
import { cliState, saveStoredToken } from '../api/api.js';

const unicode = isUnicodeSupported();

export async function startInteractiveDashboard() {
  console.clear();
  p.intro(chalk.bgBlue.cyan(' AERO ') + ' ' + chalk.cyan('Self-Hosted Cloud Platform - Version 1.0.0'));

  while (true) {
    const isLoggedIn = !!cliState.token;

    const options = [];

    if (!isLoggedIn) {
      options.push({ value: 'login', label: unicode ? '🔑 Login to Aero' : '> Login to Aero' });
      options.push({ value: 'register', label: unicode ? '📝 Create an Account' : '> Create an Account' });
      options.push({ value: 'githubLogin', label: unicode ? '🐙 Login with GitHub' : '> Login with GitHub' });
    } else {
      options.push({ value: 'create', label: unicode ? '➕ Create & Deploy New Service' : '> Create & Deploy New Service' });
      options.push({ value: 'deploy', label: unicode ? '🚀 Deploy Existing Service' : '> Deploy Existing Service' });
      options.push({ value: 'logs', label: unicode ? '📄 View Deployment Logs' : '> View Deployment Logs' });
      options.push({ value: 'chat', label: unicode ? '💬 Chat with Aero Assistant' : '> Chat with Aero Assistant' });
      options.push({ value: 'logout', label: unicode ? '🚪 Logout' : '> Logout' });
    }
    options.push({ value: 'exit', label: unicode ? '❌ Exit' : '> Exit' });

    const response = await p.select({
      message: 'What would you like to do?',
      options,
    });

    if (p.isCancel(response) || response === 'exit') {
      p.outro(chalk.cyan('Goodbye!'));
      process.exit(0);
    }

    switch (response) {
      case 'login':
        await loginAction();
        break;
      case 'register':
        await registerAction();
        break;
      case 'githubLogin':
        await githubLoginAction();
        break;
      case 'create':
        await createAction();
        break;
      case 'deploy':
        await deployAction();
        break;
      case 'logs':
        await logsAction();
        break;
      case 'chat':
        await chatAction();
        break;
      case 'logout':
        saveStoredToken(null);
        p.outro(chalk.green('Successfully logged out.'));
        await new Promise(r => setTimeout(r, 1000));
        console.clear();
        p.intro(chalk.bgBlue.cyan(' AERO '));
        break;
    }
  }
}
