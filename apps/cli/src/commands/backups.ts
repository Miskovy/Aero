/**
 * backups.ts — Database and persistent volume backup/restore management commands.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth, unwrapData } from '../api/api.js';
import { renderTable } from '../utils/tables.js';
import icons from '../utils/icons.js';

async function promptForService(): Promise<string | undefined> {
  const s = p.spinner();
  s.start('Loading services...');
  try {
    const rawServices = await apiRequest<any>({ method: 'GET', url: '/services' });
    const services = unwrapData(rawServices);
    s.stop('');

    if (!services || services.length === 0) {
      p.log.info('No services available.');
      return undefined;
    }

    const selection = await p.select({
      message: 'Select a service for backup management:',
      options: services.map((srv) => ({
        value: srv.id,
        label: `${srv.name} (${srv.type})`,
      })),
    });
    if (p.isCancel(selection)) return undefined;
    return selection as string;
  } catch {
    s.stop(chalk.red(`${icons.error} Failed to load services.`));
    return undefined;
  }
}

export async function backupsListAction(serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  const s = p.spinner();
  s.start('Loading backups...');

  try {
    const raw = await apiRequest<any>({ method: 'GET', url: `/services/${serviceId}/backups` });
    const backups = unwrapData(raw);
    s.stop(`${icons.success} Backups loaded!`);

    if (!backups || backups.length === 0) {
      p.log.info('No backups recorded yet for this service.');
      return;
    }

    const output = renderTable(
      [
        { header: 'ID', accessor: (b) => chalk.dim(b.id?.substring(0, 8) || ''), maxWidth: 12 },
        { header: 'FILENAME', accessor: 'filename', maxWidth: 36 },
        {
          header: 'SIZE',
          accessor: (b) => `${((b.size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB`,
          maxWidth: 14,
        },
        { header: 'STATUS', accessor: (b) => (b.status || '').toUpperCase(), maxWidth: 12 },
        {
          header: 'CREATED',
          accessor: (b) => (b.created_at ? new Date(b.created_at).toLocaleString() : ''),
          maxWidth: 24,
        },
      ],
      backups,
      { title: `${icons.service} Backups` },
    );

    console.log(output);
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to load backups.`));
    p.log.error(err.message || 'Unknown error');
  }
}

export async function backupsCreateAction(serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  const s = p.spinner();
  s.start('Triggering container backup dump...');

  try {
    const backup = await apiRequest<any>({
      method: 'POST',
      url: `/services/${serviceId}/backups`,
    });

    s.stop(chalk.green(`${icons.success} Backup created successfully!`));
    p.note(
      `Filename: ${chalk.cyan(backup.filename)}\nSize: ${chalk.yellow(((backup.size_bytes || 0) / (1024 * 1024)).toFixed(2) + ' MB')}\nStatus: ${chalk.green(backup.status)}`,
      'Backup Details',
    );
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to trigger backup.`));
    p.log.error(err.message || 'Unknown error');
  }
}

export async function backupsRestoreAction(serviceId?: string, backupId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    serviceId = await promptForService();
    if (!serviceId) return;
  }

  if (!backupId) {
    const s = p.spinner();
    s.start('Loading backups...');
    let backups: any[] = [];
    try {
      const raw = await apiRequest<any>({ method: 'GET', url: `/services/${serviceId}/backups` });
      backups = unwrapData(raw);
      s.stop('');
    } catch {
      s.stop(chalk.red(`${icons.error} Failed to load backups.`));
      return;
    }

    if (backups.length === 0) {
      p.log.info('No backups available to restore.');
      return;
    }

    const selection = await p.select({
      message: 'Select a backup archive to restore:',
      options: backups.map((b) => ({
        value: b.id,
        label: `${b.filename} (${((b.size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB)`,
      })),
    });
    if (p.isCancel(selection)) return;
    backupId = selection as string;
  }

  const confirm = await p.confirm({
    message: chalk.yellow('Restoring a backup will overwrite current database/container data. Continue?'),
    initialValue: false,
  });
  if (p.isCancel(confirm) || !confirm) return p.outro(chalk.gray('Restore cancelled.'));

  const s = p.spinner();
  s.start('Initiating restore process...');

  try {
    const res = await apiRequest<any>({
      method: 'POST',
      url: `/services/${serviceId}/backups/${backupId}/restore`,
    });

    s.stop(chalk.green(`${icons.success} ${res.message || 'Restore process initiated successfully!'}`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to restore backup.`));
    p.log.error(err.message || 'Unknown error');
  }
}
