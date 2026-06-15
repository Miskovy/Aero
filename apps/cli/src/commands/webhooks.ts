/**
 * webhooks.ts — Webhook endpoint management commands.
 *
 * Uses the professional table renderer, requireAuth guard, and clack prompts.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth } from '../api/api.js';
import { renderTable } from '../utils/tables.js';
import icons from '../utils/icons.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function promptForService(): Promise<string | undefined> {
  const s = p.spinner();
  s.start('Loading services...');

  try {
    const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
    s.stop('');

    if (!services || services.length === 0) {
      p.log.info('No services available.');
      return undefined;
    }

    const selection = await p.select({
      message: 'Select a service to manage webhooks:',
      options: services.map((srv) => ({ value: srv.id, label: srv.name })),
    });
    if (p.isCancel(selection)) return undefined;
    return selection as string;
  } catch (err: any) {
    s.stop(`${icons.error} Failed to load services.`);
    p.log.error(err.message);
    return undefined;
  }
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function webhooksListAction(serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  const s = p.spinner();
  s.start('Fetching webhooks...');

  try {
    const webhooks = await apiRequest<any[]>({
      method: 'GET',
      url: `/services/${serviceId}/webhooks`,
    });
    s.stop(`${icons.success} Webhooks loaded!`);

    if (!webhooks || webhooks.length === 0) {
      p.log.info('No webhooks configured for this service.');
      return;
    }

    const output = renderTable(
      [
        { header: 'NAME', accessor: 'name', maxWidth: 20 },
        { header: 'PROVIDER', accessor: (r) => chalk.cyan(r.provider), maxWidth: 12 },
        { header: 'BRANCH', accessor: (r) => r.branch_filter || 'all', maxWidth: 12 },
        {
          header: 'STATUS',
          accessor: (r) => r.is_active ? chalk.green('active') : chalk.gray('inactive'),
          maxWidth: 10,
        },
        { header: 'URL', accessor: (r) => chalk.dim(r.webhook_url), maxWidth: 50 },
      ],
      webhooks,
      { title: `${icons.service} Webhooks` },
    );

    console.log(output);
  } catch (err: any) {
    s.stop(`${icons.error} Failed to fetch webhooks.`);
    p.log.error(err.message);
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function webhooksCreateAction(serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  const name = await p.text({
    message: 'Enter webhook name (e.g., GitHub Deploy Hook):',
    validate: (val) => (!val ? 'Webhook name is required.' : undefined),
  });
  if (p.isCancel(name)) return;

  const provider = await p.select({
    message: 'Select webhook provider:',
    options: [
      { value: 'github', label: 'GitHub' },
      { value: 'gitlab', label: 'GitLab' },
      { value: 'bitbucket', label: 'Bitbucket' },
      { value: 'custom', label: 'Custom / Generic' },
    ],
  });
  if (p.isCancel(provider)) return;

  const branchFilter = await p.text({
    message: 'Enter branch filter (optional, e.g. main):',
    initialValue: '',
  });
  if (p.isCancel(branchFilter)) return;

  const s = p.spinner();
  s.start('Creating webhook...');

  try {
    const data = await apiRequest<any>({
      method: 'POST',
      url: `/services/${serviceId}/webhooks`,
      data: {
        name,
        provider,
        events: ['push'],
        branchFilter: branchFilter.trim() || undefined,
      },
    });
    s.stop(chalk.green(`${icons.success} Webhook successfully created.`));

    console.log('');
    p.log.success(chalk.bold('Webhook Details:'));
    console.log(`  ${chalk.dim('Name:')}         ${data.name}`);
    console.log(`  ${chalk.dim('Provider:')}     ${data.provider}`);
    console.log(`  ${chalk.dim('Payload URL:')}  ${chalk.cyan(data.webhook_url)}`);
    console.log(`  ${chalk.dim('Secret:')}       ${chalk.yellow(data.secret_token)}`);
    console.log('');
    p.log.warn(
      chalk.bold(
        'IMPORTANT: The secret token is only displayed once! Make sure to copy it now.',
      ),
    );
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to create webhook.`));
    p.log.error(err.message);
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function webhooksDeleteAction(serviceId?: string, webhookId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  if (!webhookId) {
    const s = p.spinner();
    s.start('Loading webhooks...');
    let webhooks: any[] = [];
    try {
      webhooks = await apiRequest<any[]>({
        method: 'GET',
        url: `/services/${serviceId}/webhooks`,
      });
      s.stop('');
      if (!webhooks || webhooks.length === 0) {
        p.log.info('No webhooks configured.');
        return;
      }
    } catch (err: any) {
      s.stop(`${icons.error} Failed to load webhooks.`);
      p.log.error(err.message);
      return;
    }

    const selection = await p.select({
      message: 'Select a webhook to delete:',
      options: webhooks.map((w) => ({
        value: w.id,
        label: `${w.name} (${w.provider})`,
      })),
    });
    if (p.isCancel(selection)) return;
    webhookId = selection as string;
  }

  const confirm = await p.confirm({
    message: chalk.red('Are you sure you want to delete this webhook?'),
    initialValue: false,
  });
  if (p.isCancel(confirm) || !confirm) return;

  const s = p.spinner();
  s.start('Deleting webhook...');

  try {
    await apiRequest({
      method: 'DELETE',
      url: `/services/${serviceId}/webhooks/${webhookId}`,
    });
    s.stop(chalk.green(`${icons.success} Webhook successfully deleted.`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to delete webhook.`));
    p.log.error(err.message);
  }
}
