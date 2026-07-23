#!/usr/bin/env node

/**
 * index.ts — Aero CLI entry point.
 *
 * Registers all commands, installs the terminal safety net,
 * and launches the interactive TUI if no arguments are provided.
 */

import { Command } from 'commander';
import { installTerminalSafetyNet } from './utils/safe-action.js';
import { startInteractiveDashboard } from './ui/dashboard.js';
import { loginAction, githubLoginAction, logoutAction } from './commands/login.js';
import { deployAction } from './commands/deploy.js';
import { chatAction } from './commands/chat.js';
import { logsAction } from './commands/logs.js';
import { createDaemonCommand } from './commands/daemon.js';
import { createMarketplaceCommand } from './commands/marketplace.js';
import { createConfigCommand, createTargetCommand } from './commands/config-command.js';
import {
  servicesListAction,
  servicesStartAction,
  servicesStopAction,
  servicesRestartAction,
  servicesDeleteAction,
  servicesInspectAction,
} from './commands/services.js';
import { envListAction, envSetAction, envUnsetAction, envImportAction } from './commands/env.js';
import { nodeListAction, nodeAddAction, nodeRemoveAction } from './commands/nodes.js';
import {
  webhooksListAction,
  webhooksCreateAction,
  webhooksDeleteAction,
} from './commands/webhooks.js';
import {
  domainsListAction,
  domainsAddAction,
  domainsRemoveAction,
} from './commands/domains.js';
import {
  backupsListAction,
  backupsCreateAction,
  backupsRestoreAction,
} from './commands/backups.js';
import {
  projectsListAction,
  projectsInspectAction,
  projectsCreateAction,
  projectsUpdateAction,
  projectsDeleteAction,
} from './commands/projects.js';
import { createAction } from './commands/create.js';
import { statusAction } from './commands/status.js';

// ── Install global terminal safety net ──
installTerminalSafetyNet();

// ── Program ──
const program = new Command();

program
  .name('aero')
  .description('Aero CLI tool for managing your self-hosted cloud platform')
  .version('1.0.0');

// ── Core commands ──
program.command('status').description('Check the overall health of the Aero control plane').action(statusAction);
program.command('login').description('Login to your Aero instance').action(loginAction);
program.command('githublogin').description('Login to Aero using GitHub authentication').action(githubLoginAction);
program.command('logout').description('Logout of your Aero instance').action(logoutAction);
program.command('create').description('Create a new service').action(createAction);
program.command('deploy').description('Deploy a new service to Aero').action(deployAction);
program.command('chat').description('Start interactive chat assistant [Coming Soon]').action(chatAction);
program.command('logs').description('View logs for a deployment').argument('[serviceId]', 'ID of the service').action(logsAction);

// ── Services ──
const servicesCmd = new Command('services').description('Manage services');
servicesCmd.command('list').description('List all services').action(servicesListAction);
servicesCmd.command('inspect [id]').description('Inspect a service').action(servicesInspectAction);
servicesCmd.command('start [id]').description('Start a service').action(servicesStartAction);
servicesCmd.command('stop [id]').description('Stop a service').action(servicesStopAction);
servicesCmd.command('restart [id]').description('Restart a service').action(servicesRestartAction);
servicesCmd.command('delete [id]').description('Delete a service').action(servicesDeleteAction);
program.addCommand(servicesCmd);

// ── Environment Variables ──
const envCmd = new Command('env').description('Manage environment variables');
envCmd.command('list [serviceId]').description('List all environment variables for a service').action(envListAction);
envCmd.command('set [serviceId] [key] [value]').description('Set an environment variable').action(envSetAction);
envCmd.command('unset [serviceId] [key]').description('Unset an environment variable').action(envUnsetAction);
envCmd.command('import [serviceId] [filepath]').description('Import a .env file').action(envImportAction);
program.addCommand(envCmd);

// ── Webhooks ──
const webhooksCmd = new Command('webhooks').description('Manage service webhooks');
webhooksCmd.command('list [serviceId]').description('List all webhooks for a service').action(webhooksListAction);
webhooksCmd.command('create [serviceId]').description('Create a new webhook for a service').action(webhooksCreateAction);
webhooksCmd.command('delete [serviceId] [webhookId]').description('Delete a webhook').action(webhooksDeleteAction);
program.addCommand(webhooksCmd);

// ── Domains ──
const domainsCmd = new Command('domains').description('Manage service domains');
domainsCmd.command('list [serviceId]').description('List all domains for a service').action(domainsListAction);
domainsCmd.command('add [serviceId] [domain]').description('Add a domain to a service').action(domainsAddAction);
domainsCmd.command('remove [serviceId] [domainId]').description('Remove a domain from a service').action(domainsRemoveAction);
program.addCommand(domainsCmd);

// ── Backups ──
const backupsCmd = new Command('backups').description('Manage database and volume backups');
backupsCmd.command('list [serviceId]').description('List all backups for a service').action(backupsListAction);
backupsCmd.command('create [serviceId]').description('Trigger a database or volume backup dump').action(backupsCreateAction);
backupsCmd.command('restore [serviceId] [backupId]').description('Restore a service from a backup archive').action(backupsRestoreAction);
program.addCommand(backupsCmd);

// ── Nodes ──
const nodeCmd = new Command('node').description('Manage connected servers (nodes)');
nodeCmd.command('list').description('List all servers').action(nodeListAction);
nodeCmd.command('add [name]').description('Register a new server and generate a token').action(nodeAddAction);
nodeCmd.command('remove').description('Revoke access for a server').action(nodeRemoveAction);
program.addCommand(nodeCmd);

// ── Projects ──
const projectsCmd = new Command('projects').description('Manage projects');
projectsCmd.command('list').description('List all projects').action(projectsListAction);
projectsCmd.command('inspect').description('Inspect a project').action(projectsInspectAction);
projectsCmd.command('create').description('Create a new project').action(projectsCreateAction);
projectsCmd.command('update').description('Rename or update a project').action(projectsUpdateAction);
projectsCmd.command('delete').description('Delete a project').action(projectsDeleteAction);
program.addCommand(projectsCmd);

// ── Config & Target ──
program.addCommand(createConfigCommand());
program.addCommand(createTargetCommand());

// ── Marketplace & Daemon ──
program.addCommand(createMarketplaceCommand());
program.addCommand(createDaemonCommand());

// ── Launch ──
if (process.argv.length === 2) {
  startInteractiveDashboard();
} else {
  program.parse(process.argv);
}
