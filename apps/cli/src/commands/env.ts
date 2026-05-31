/**
 * env.ts — Environment variable management commands.
 *
 * Uses professional table renderer, requireAuth guard, and icons system.
 * Reports individual import failures instead of silently swallowing them.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
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
      message: 'Select a service for environment variables:',
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

export async function envListAction(serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  const s = p.spinner();
  s.start('Fetching environment variables...');

  try {
    const [serviceDetails, secrets] = await Promise.allSettled([
      apiRequest<any>({ method: 'GET', url: `/services/${serviceId}` }),
      apiRequest<any[]>({ method: 'GET', url: `/services/${serviceId}/secrets` }),
    ]);
    s.stop(`${icons.success} Environment variables loaded!`);

    const allVars: { key: string; source: string }[] = [];

    if (serviceDetails.status === 'fulfilled' && serviceDetails.value?.variables) {
      for (const v of serviceDetails.value.variables) {
        allVars.push({ key: v.key, source: 'env' });
      }
    }

    if (secrets.status === 'fulfilled' && Array.isArray(secrets.value)) {
      for (const secret of secrets.value) {
        if (!allVars.some((v) => v.key === secret.key)) {
          allVars.push({ key: secret.key, source: 'secret' });
        }
      }
    }

    if (allVars.length === 0) {
      p.log.info('No environment variables set for this service.');
      return;
    }

    const output = renderTable(
      [
        { header: 'KEY', accessor: 'key', maxWidth: 36 },
        {
          header: 'SOURCE',
          accessor: (r) => r.source === 'env' ? chalk.cyan('env') : chalk.yellow('secret'),
          maxWidth: 10,
        },
      ],
      allVars,
      { title: `${icons.env} Environment Variables` },
    );

    console.log(output);
  } catch (err: any) {
    s.stop(`${icons.error} Failed to fetch environment variables.`);
    p.log.error(err.message);
  }
}

// ─── Set ─────────────────────────────────────────────────────────────────────

export async function envSetAction(serviceId?: string, key?: string, value?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  if (!key) {
    const keyPrompt = await p.text({ message: 'Enter variable key (e.g., DATABASE_URL):' });
    if (p.isCancel(keyPrompt) || !keyPrompt) return;
    key = keyPrompt as string;
  }

  if (!value) {
    const valPrompt = await p.text({ message: `Enter value for ${key}:` });
    if (p.isCancel(valPrompt) || !valPrompt) return;
    value = valPrompt as string;
  }

  const s = p.spinner();
  s.start(`Setting ${key}...`);

  try {
    await apiRequest({
      method: 'POST',
      url: `/services/${serviceId}/secrets`,
      data: { key, value },
    });
    s.stop(chalk.green(`${icons.success} Successfully set environment variable ${chalk.bold(key)}.`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to set ${key}.`));
    p.log.error(err.message);
  }
}

// ─── Unset ───────────────────────────────────────────────────────────────────

export async function envUnsetAction(serviceId?: string, key?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  let secrets: any[] = [];
  try {
    secrets = await apiRequest<any[]>({ method: 'GET', url: `/services/${serviceId}/secrets` });
  } catch {
    p.log.error('Failed to fetch secrets to delete.');
    return;
  }

  if (secrets.length === 0) {
    p.log.info('No variables to remove.');
    return;
  }

  const secretToDelete = key ? secrets.find((s) => s.key === key) : null;

  if (!secretToDelete) {
    const selection = await p.select({
      message: 'Select a variable to unset:',
      options: secrets.map((s) => ({ value: s.id, label: s.key })),
    });
    if (p.isCancel(selection)) return;
    await deleteSecret(serviceId, selection as string);
    return;
  }

  await deleteSecret(serviceId, secretToDelete.id);
}

async function deleteSecret(serviceId: string, secretId: string) {
  const s = p.spinner();
  s.start('Deleting variable...');

  try {
    await apiRequest({ method: 'DELETE', url: `/services/${serviceId}/secrets/${secretId}` });
    s.stop(chalk.green(`${icons.success} Successfully deleted environment variable.`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to delete variable.`));
    p.log.error(err.message);
  }
}

// ─── Import ──────────────────────────────────────────────────────────────────

export async function envImportAction(serviceId?: string, filepath?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  if (!filepath) {
    const fp = await p.text({ message: 'Enter path to .env file:', initialValue: '.env' });
    if (p.isCancel(fp) || !fp) return;
    filepath = fp as string;
  }

  const s = p.spinner();
  s.start('Importing environment variables...');

  try {
    const fullPath = path.resolve(process.cwd(), filepath);
    const content = await fs.readFile(fullPath, 'utf8');
    const lines = content.split('\n');
    let imported = 0;
    const failures: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
        const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
        try {
          await apiRequest({
            method: 'POST',
            url: `/services/${serviceId}/secrets`,
            data: { key: key.trim(), value: val },
          });
          imported++;
        } catch (err: any) {
          failures.push(`${key.trim()}: ${err.message}`);
        }
      }
    }

    s.stop(chalk.green(`${icons.success} Imported ${imported} variable(s).`));

    if (failures.length > 0) {
      console.log('');
      p.log.warn(chalk.yellow(`${failures.length} variable(s) failed to import:`));
      for (const f of failures) {
        console.log(chalk.dim(`  ${icons.error} ${f}`));
      }
    }
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to import environment variables.`));
    p.log.error(err.message);
  }
}
