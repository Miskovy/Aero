#!/usr/bin/env node

import { Command } from 'commander';
import { startInteractiveDashboard } from './ui/dashboard.js';
import { githubLoginAction, loginAction, logoutAction } from './commands/login.js';
import { deployAction } from './commands/deploy.js';
import { chatAction } from './commands/chat.js';
import { logsAction } from './commands/logs.js';
import { createDaemonCommand } from './commands/daemon.js';
import { createMarketplaceCommand } from './commands/marketplace.js';
import { 
  servicesListAction, 
  servicesStartAction, 
  servicesStopAction, 
  servicesRestartAction, 
  servicesDeleteAction, 
  servicesInspectAction 
} from './commands/services.js';
import { envListAction, envSetAction, envUnsetAction, envImportAction } from './commands/env.js';
import { nodeListAction, nodeAddAction, nodeRemoveAction } from './commands/nodes.js';
import { projectsListAction, projectsInspectAction, projectsCreateAction, projectsUpdateAction, projectsDeleteAction } from './commands/projects.js';
import { createAction } from './commands/create.js';
import { statusAction } from './commands/status.js';

const program = new Command();

program
  .name('aero')
  .description('Aero CLI tool for managing your self-hosted cloud platform')
  .version('1.0.0');

program
  .command('status')
  .description('Check the overall health of the Aero control plane')
  .action(statusAction);

program
  .command('login')
  .description('Login to your Aero instance')
  .action(loginAction);

program
  .command('githublogin')
  .description('Login to Aero using GitHub authentication')
  .action(githubLoginAction);

program
  .command('logout')
  .description('Logout of your Aero instance')
  .action(logoutAction);

program
  .command('create')
  .description('Create a new service')
  .action(createAction);

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

const servicesCmd = new Command('services').description('Manage services');
servicesCmd.command('list').description('List all services').action(servicesListAction);
servicesCmd.command('inspect [id]').description('Inspect a service').action(servicesInspectAction);
servicesCmd.command('start [id]').description('Start a service').action(servicesStartAction);
servicesCmd.command('stop [id]').description('Stop a service').action(servicesStopAction);
servicesCmd.command('restart [id]').description('Restart a service').action(servicesRestartAction);
servicesCmd.command('delete [id]').description('Delete a service').action(servicesDeleteAction);

program.addCommand(servicesCmd);

const envCmd = new Command('env').description('Manage environment variables');
envCmd.command('list [serviceId]').description('List all environment variables for a service').action(envListAction);
envCmd.command('set [serviceId] [key] [value]').description('Set an environment variable').action(envSetAction);
envCmd.command('unset [serviceId] [key]').description('Unset an environment variable').action(envUnsetAction);
envCmd.command('import [serviceId] [filepath]').description('Import a .env file').action(envImportAction);
program.addCommand(envCmd);

const nodeCmd = new Command('node').description('Manage connected servers (nodes)');
nodeCmd.command('list').description('List all servers').action(nodeListAction);
nodeCmd.command('add [name]').description('Register a new server and generate a token').action(nodeAddAction);
nodeCmd.command('remove').description('Revoke access for a server').action(nodeRemoveAction);
program.addCommand(nodeCmd);

const projectsCmd = new Command('projects').description('Manage projects');
projectsCmd.command('list').description('List all projects').action(projectsListAction);
projectsCmd.command('inspect').description('Inspect a project').action(projectsInspectAction);
projectsCmd.command('create').description('Create a new project').action(projectsCreateAction);
projectsCmd.command('update').description('Rename or update a project').action(projectsUpdateAction);
projectsCmd.command('delete').description('Delete a project').action(projectsDeleteAction);
program.addCommand(projectsCmd);

program.addCommand(createMarketplaceCommand());
program.addCommand(createDaemonCommand());

if (process.argv.length === 2) {
  startInteractiveDashboard();
} else {
  program.parse(process.argv);
}
