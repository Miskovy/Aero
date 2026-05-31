/**
 * nodes.ts — Node (server) management commands.
 *
 * Uses professional table renderer, requireAuth guard, and icons system.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth } from '../api/api.js';
import { renderTable } from '../utils/tables.js';
import icons from '../utils/icons.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nodeStatusColor(status: string): (s: string) => string {
  return status === 'online' ? chalk.green : status === 'offline' ? chalk.red : chalk.yellow;
}

async function promptForOrg(): Promise<string | undefined> {
  const s = p.spinner();
  s.start('Loading organizations...');

  try {
    const orgs = await apiRequest<any[]>({ method: 'GET', url: '/organizations' });
    s.stop('');

    if (!orgs || orgs.length === 0) {
      p.log.info('No organizations found.');
      return undefined;
    }

    if (orgs.length === 1) return orgs[0].id;

    const selection = await p.select({
      message: 'Select an organization:',
      options: orgs.map((o) => ({ value: o.id, label: o.name })),
    });
    if (p.isCancel(selection)) return undefined;
    return selection as string;
  } catch (err: any) {
    s.stop(`${icons.error} Failed to load organizations.`);
    p.log.error(err.message);
    return undefined;
  }
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function nodeListAction() {
  if (!requireAuth()) return;

  const orgId = await promptForOrg();
  if (!orgId) return;

  const s = p.spinner();
  s.start('Fetching connected nodes...');

  try {
    const nodes = await apiRequest<any[]>({ method: 'GET', url: `/organizations/${orgId}/nodes` });
    s.stop(`${icons.success} Nodes loaded!`);

    if (!nodes || nodes.length === 0) {
      p.log.info('No servers connected to this organization yet.');
      return;
    }

    const output = renderTable(
      [
        { header: 'NAME', accessor: 'name', maxWidth: 20 },
        { header: 'STATUS', accessor: (r) => nodeStatusColor(r.status)(r.status || 'offline'), maxWidth: 12 },
        { header: 'IP ADDRESS', accessor: (r) => r.ip_address || 'unknown', maxWidth: 18 },
        { header: 'ID', accessor: (r) => chalk.dim(r.id?.substring(0, 12) || ''), maxWidth: 14 },
      ],
      nodes,
      { title: `${icons.node} Nodes` },
    );

    console.log(output);
  } catch (err: any) {
    s.stop(`${icons.error} Failed to load nodes.`);
    p.log.error(err.message);
  }
}

// ─── Add ─────────────────────────────────────────────────────────────────────

export async function nodeAddAction(name?: string) {
  if (!requireAuth()) return;

  const orgId = await promptForOrg();
  if (!orgId) return;

  if (!name) {
    const namePrompt = await p.text({
      message: 'Enter a name for the new node (e.g., Production-Ubuntu-1):',
      placeholder: 'My Server',
    });
    if (p.isCancel(namePrompt) || !namePrompt) return;
    name = namePrompt as string;
  }

  const hostnamePrompt = await p.text({
    message: 'Enter the hostname or IP of this machine:',
    placeholder: 'server.example.com or 192.168.1.100',
    initialValue: 'localhost',
  });
  if (p.isCancel(hostnamePrompt) || !hostnamePrompt) return;
  const hostname = hostnamePrompt as string;

  const ipPrompt = await p.text({
    message: 'Enter the IP address (leave empty to auto-detect):',
    placeholder: '0.0.0.0',
  });
  if (p.isCancel(ipPrompt)) return;
  const ipAddress = (ipPrompt as string) || undefined;

  const s = p.spinner();
  s.start('Registering server and generating token...');

  try {
    const response = await apiRequest<any>({
      method: 'POST',
      url: `/organizations/${orgId}/nodes`,
      data: {
        name,
        hostname,
        ...(ipAddress && { ip_address: ipAddress }),
      },
    });

    s.stop(chalk.green(`${icons.success} Server '${name}' successfully registered!`));

    p.note(
      `To connect this server, run the following command ON THE TARGET SERVER:\n\n` +
        chalk.cyan(`aero daemon start --token ${response.agent_token}`),
      'Connection Instructions',
    );

    p.outro(chalk.yellow('Keep this token safe! It will not be shown again.'));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to register node.`));
    p.log.error(err.message);
  }
}

// ─── Remove ──────────────────────────────────────────────────────────────────

export async function nodeRemoveAction() {
  if (!requireAuth()) return;

  const orgId = await promptForOrg();
  if (!orgId) return;

  let nodes: any[] = [];
  try {
    nodes = await apiRequest<any[]>({ method: 'GET', url: `/organizations/${orgId}/nodes` });
  } catch {
    p.log.error('Failed to fetch nodes.');
    return;
  }

  if (nodes.length === 0) {
    p.log.info('No servers to remove.');
    return;
  }

  const nodeId = await p.select({
    message: 'Select a server to REMOVE (this immediately revokes agent access):',
    options: nodes.map((n) => ({ value: n.id, label: n.name })),
  });
  if (p.isCancel(nodeId)) return;

  const confirm = await p.confirm({
    message: chalk.red('Are you sure you want to delete this node?'),
    initialValue: false,
  });
  if (p.isCancel(confirm) || !confirm) return;

  const s = p.spinner();
  s.start('Removing server...');

  try {
    await apiRequest({ method: 'DELETE', url: `/organizations/${orgId}/nodes/${nodeId}` });
    s.stop(chalk.green(`${icons.success} Server removed. The agent on that machine will be immediately disconnected.`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to remove server.`));
    p.log.error(err.message);
  }
}
