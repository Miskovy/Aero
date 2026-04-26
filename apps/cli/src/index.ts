#!/usr/bin/env node

import { Command } from 'commander';
import { startInteractiveDashboard } from './ui/dashboard.js';
import { githubLoginAction, loginAction } from './commands/login.js';
import { deployAction } from './commands/deploy.js';
import { chatAction } from './commands/chat.js';
import { logsAction } from './commands/logs.js';

const program = new Command();

program
  .name('aero')
  .description('Aero CLI tool for managing your self-hosted cloud platform')
  .version('1.0.0');

program
  .command('login')
  .description('Login to your Aero instance')
  .action(loginAction);

program
  .command('githublogin')
  .description('Login to Aero using GitHub authentication')
  .action(githubLoginAction);

program
  .command('deploy')
  .description('Deploy a new service to Aero')
  .action(deployAction);

program
  .command('chat')
  .description('Start interactive chat assistant')
  .action(chatAction);

program
  .command('logs')
  .description('View logs for a deployment')
  .argument('[serviceId]', 'ID of the service')
  .action(logsAction);

if (process.argv.length === 2) {
  startInteractiveDashboard();
} else {
  program.parse(process.argv);
}
