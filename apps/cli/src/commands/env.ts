import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { apiRequest } from '../api/api.js';

async function promptForService(): Promise<string | undefined> {
  const s = p.spinner();
  s.start('Loading services...');
  try {
    const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
    s.stop();
    if (!services || services.length === 0) {
      p.log.info('No services available.');
      return undefined;
    }
    const selection = await p.select({
      message: 'Select a service for environment variables:',
      options: services.map(srv => ({ value: srv.id, label: srv.name }))
    });
    if (p.isCancel(selection)) return undefined;
    return selection as string;
  } catch (err: any) {
    s.stop('Failed to load services.');
    p.log.error(err.message);
    return undefined;
  }
}

export async function envListAction(serviceId?: string) {
  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  const s = p.spinner();
  s.start('Fetching environment variables...');
  try {
    // Fetch from both sources: EnvironmentVariable table and ServiceSecret table
    const [serviceDetails, secrets] = await Promise.allSettled([
      apiRequest<any>({ method: 'GET', url: `/services/${serviceId}` }),
      apiRequest<any[]>({ method: 'GET', url: `/services/${serviceId}/secrets` }),
    ]);
    s.stop('Environment variables loaded!');

    // Merge variables from both tables
    const allVars: { key: string; source: string }[] = [];

    // From EnvironmentVariable table (stored during service creation)
    if (serviceDetails.status === 'fulfilled' && serviceDetails.value?.variables) {
      for (const v of serviceDetails.value.variables) {
        allVars.push({ key: v.key, source: 'env' });
      }
    }

    // From ServiceSecret table (stored via /secrets endpoint)
    if (secrets.status === 'fulfilled' && Array.isArray(secrets.value)) {
      for (const s of secrets.value) {
        // Avoid duplicates
        if (!allVars.some(v => v.key === s.key)) {
          allVars.push({ key: s.key, source: 'secret' });
        }
      }
    }

    if (allVars.length === 0) {
      p.log.info(`No environment variables set for this service.`);
      return;
    }

    console.log('\nKEY                              SOURCE');
    console.log('--------------------------------------------------');
    for (const v of allVars) {
      const sourceLabel = v.source === 'env' ? chalk.cyan('env') : chalk.yellow('secret');
      console.log(`${chalk.white(v.key.padEnd(32))} ${sourceLabel}`);
    }
    console.log();
  } catch (err: any) {
    s.stop('Failed to fetch environment variables.');
    p.log.error(err.message);
  }
}

export async function envSetAction(serviceId?: string, key?: string, value?: string) {
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
    // Try creating it first; if it exists (assuming API handles it or throws 409) we could patch it.
    // The current API might just accept POST for create or PATCH for update. Let's try POST.
    await apiRequest({
      method: 'POST',
      url: `/services/${serviceId}/secrets`,
      data: { key, value }
    });
    s.stop(chalk.green(`Successfully set environment variable ${key}.`));
  } catch (err: any) {
    // If it already exists, you'd typically need to PATCH it. For MVP, we pass the error along if POST fails.
    s.stop(chalk.red(`Failed to set ${key}.`));
    p.log.error(err.message);
  }
}

export async function envUnsetAction(serviceId?: string, key?: string) {
  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  let secrets: any[] = [];
  try {
    secrets = await apiRequest<any[]>({ method: 'GET', url: `/services/${serviceId}/secrets` });
  } catch (err: any) {
    p.log.error('Failed to lookup secrets to delete.');
    return;
  }

  const secretToDelete = secrets.find(s => s.key === key);
  if (!key || !secretToDelete) {
     const selection = await p.select({
       message: 'Select a variable to unset:',
       options: secrets.map(s => ({ value: s.id, label: s.key }))
     });
     if (p.isCancel(selection)) return;
     const id = selection as string;
     await deleteSecret(serviceId, id);
     return;
  }

  await deleteSecret(serviceId, secretToDelete.id);
}

async function deleteSecret(serviceId: string, secretId: string) {
  const s = p.spinner();
  s.start('Deleting variable...');
  try {
    await apiRequest({ method: 'DELETE', url: `/services/${serviceId}/secrets/${secretId}` });
    s.stop(chalk.green('Successfully deleted environment variable.'));
  } catch (err: any) {
    s.stop(chalk.red('Failed to delete variable.'));
    p.log.error(err.message);
  }
}

export async function envImportAction(serviceId?: string, filepath?: string) {
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

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
        const val = rest.join('=').trim().replace(/^['"]|['"]$/g, ''); // strip quotes
        try {
          await apiRequest({ method: 'POST', url: `/services/${serviceId}/secrets`, data: { key: key.trim(), value: val } });
          imported++;
        } catch { } // ignore individual failures during bulk import for MVP
      }
    }
    s.stop(chalk.green(`Successfully imported ${imported} variables.`));
  } catch (err: any) {
    s.stop(chalk.red('Failed to import environment variables.'));
    p.log.error(err.message);
  }
}
