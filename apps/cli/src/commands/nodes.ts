import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest } from '../api/api.js';

async function promptForOrg(): Promise<string | undefined> {
  const s = p.spinner();
  s.start('Loading organizations...');
  try {
    const orgs = await apiRequest<any[]>({ method: 'GET', url: '/organizations' });
    s.stop();
    if (!orgs || orgs.length === 0) {
      p.log.info('No organizations found.');
      return undefined;
    }
    const selection = await p.select({
      message: 'Select an organization:',
      options: orgs.map(o => ({ value: o.id, label: o.name }))
    });
    if (p.isCancel(selection)) return undefined;
    return selection as string;
  } catch (err: any) {
    s.stop('Failed to load organizations.');
    p.log.error(err.message);
    return undefined;
  }
}

export async function nodeListAction() {
  const orgId = await promptForOrg();
  if (!orgId) return;

  const s = p.spinner();
  s.start('Fetching connected nodes (servers)...');
  try {
    const nodes = await apiRequest<any[]>({ method: 'GET', url: `/organizations/${orgId}/nodes` });
    s.stop('Nodes loaded!');

    if (!nodes || nodes.length === 0) {
      p.log.info('No servers connected to this organization yet.');
      return;
    }

    console.log('\nID                                   NAME            STATUS       IP ADDRESS');
    console.log('--------------------------------------------------------------------------------------');
    for (const node of nodes) {
      const statusColor = node.status === 'online' ? chalk.green : chalk.yellow;
      console.log(`${node.id.padEnd(36)} ${node.name.padEnd(15)} ${statusColor((node.status || 'offline').padEnd(12))} ${node.ip_address || 'unknown'}`);
    }
    console.log();
  } catch (err: any) {
    s.stop('Failed to load nodes.');
    p.log.error(err.message);
  }
}

export async function nodeAddAction(name?: string) {
  const orgId = await promptForOrg();
  if (!orgId) return;

  if (!name) {
    const namePrompt = await p.text({
      message: 'Enter a name for the new node (e.g., Production-Ubuntu-1):',
      placeholder: 'My Server'
    });
    if (p.isCancel(namePrompt) || !namePrompt) return;
    name = namePrompt as string;
  }

  const s = p.spinner();
  s.start('Registering server and generating token...');
  try {
    const response = await apiRequest<any>({
      method: 'POST',
      url: `/organizations/${orgId}/nodes`,
      data: { name }
    });
    
    s.stop(chalk.green(`Server '${name}' successfully registered!`));
    
    p.note(
      `To connect this server, run the following command ON THE TARGET SERVER:\n\n` +
      chalk.cyan(`aero daemon start --token ${response.agent_token}`),
      'Connection Instructions'
    );

    p.outro(chalk.yellow('Keep this token safe! It will not be shown again.'));
  } catch (err: any) {
    s.stop(chalk.red('Failed to register node.'));
    p.log.error(err.message);
  }
}

export async function nodeRemoveAction() {
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
    message: 'Select a server to REMOVE (this immediately revoked agent access):',
    options: nodes.map(n => ({ value: n.id, label: n.name }))
  });

  if (p.isCancel(nodeId)) return;

  const confirm = await p.confirm({ message: 'Are you sure you want to delete this node?', initialValue: false });
  if (p.isCancel(confirm) || !confirm) return;

  const s = p.spinner();
  s.start('Removing server...');
  try {
    await apiRequest({ method: 'DELETE', url: `/organizations/${orgId}/nodes/${nodeId}` });
    s.stop(chalk.green('Server removed. The agent on that machine will be immediately disconnected.'));
  } catch (err: any) {
    s.stop(chalk.red('Failed to remove server.'));
    p.log.error(err.message);
  }
}
