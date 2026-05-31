/**
 * services.ts — Service lifecycle management commands.
 *
 * Uses the professional table renderer and requireAuth() guard.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth } from '../api/api.js';
import { renderTable } from '../utils/tables.js';
import icons from '../utils/icons.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): (s: string) => string {
  switch (status?.toLowerCase()) {
    case 'running':   return chalk.green;
    case 'failed':    return chalk.red;
    case 'deploying':
    case 'building':
    case 'queued':    return chalk.yellow;
    case 'stopped':   return chalk.gray;
    default:          return chalk.white;
  }
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function servicesListAction() {
  if (!requireAuth()) return;

  const s = p.spinner();
  s.start('Fetching services...');

  try {
    const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
    s.stop(`${icons.success} Services loaded!`);

    if (!services || services.length === 0) {
      p.log.info('No services found.');
      return;
    }

    const output = renderTable(
      [
        { header: 'NAME', accessor: 'name', maxWidth: 24 },
        { header: 'STATUS', accessor: (r) => statusColor(r.status)(r.status || 'unknown'), maxWidth: 14 },
        { header: 'TYPE', accessor: 'source_type', maxWidth: 14 },
        { header: 'ID', accessor: (r) => chalk.dim(r.id?.substring(0, 12) || ''), maxWidth: 14 },
      ],
      services,
      { title: `${icons.service} Services` },
    );

    console.log(output);
  } catch (err: any) {
    s.stop(`${icons.error} Failed to load services.`);
    p.log.error(err.message);
  }
}

// ─── Lifecycle (start / stop / restart / delete) ─────────────────────────────

async function handleServiceLifecycle(action: 'start' | 'stop' | 'restart' | 'delete', serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    const s = p.spinner();
    s.start('Loading services...');
    try {
      const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
      s.stop('');
      if (!services || services.length === 0) {
        p.log.info('No services available.');
        return;
      }
      const selection = await p.select({
        message: `Select a service to ${action}:`,
        options: services.map((srv) => ({
          value: srv.id,
          label: `${srv.name} (${statusColor(srv.status)(srv.status || 'unknown')})`,
        })),
      });
      if (p.isCancel(selection)) return;
      serviceId = selection as string;
    } catch (err: any) {
      s.stop(`${icons.error} Failed to load services.`);
      p.log.error(err.message);
      return;
    }
  }

  if (action === 'delete') {
    const confirm = await p.confirm({
      message: chalk.red('Are you sure you want to delete this service?'),
      initialValue: false,
    });
    if (p.isCancel(confirm) || !confirm) return;
  }

  const s = p.spinner();
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
  s.start(`${actionLabel}ing service...`);

  try {
    if (action === 'delete') {
      await apiRequest({ method: 'DELETE', url: `/services/${serviceId}` });
    } else {
      await apiRequest({ method: 'POST', url: `/services/${serviceId}/${action}` });
    }
    s.stop(chalk.green(`${icons.success} Service successfully ${action}ed.`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to ${action} service.`));
    p.log.error(err.message);
  }
}

export const servicesStartAction = (id?: string) => handleServiceLifecycle('start', id);
export const servicesStopAction = (id?: string) => handleServiceLifecycle('stop', id);
export const servicesRestartAction = (id?: string) => handleServiceLifecycle('restart', id);
export const servicesDeleteAction = (id?: string) => handleServiceLifecycle('delete', id);

// ─── Inspect ─────────────────────────────────────────────────────────────────

export async function servicesInspectAction(serviceId?: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    const s = p.spinner();
    s.start('Loading services...');
    try {
      const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
      s.stop('');
      if (!services || services.length === 0) {
        p.log.info('No services available.');
        return;
      }
      const selection = await p.select({
        message: 'Select a service to inspect:',
        options: services.map((srv) => ({ value: srv.id, label: srv.name })),
      });
      if (p.isCancel(selection)) return;
      serviceId = selection as string;
    } catch (err: any) {
      s.stop(`${icons.error} Failed to load services.`);
      p.log.error(err.message);
      return;
    }
  }

  const s = p.spinner();
  s.start('Inspecting service...');

  try {
    const svc = await apiRequest<any>({ method: 'GET', url: `/services/${serviceId}` });
    s.stop(`${icons.success} Service loaded.`);

    const statusFn = statusColor(svc.status);

    console.log('');
    console.log(chalk.bold(`  ${icons.inspect} Service Details`));
    console.log(chalk.dim(`  ${icons.separator.repeat(40)}`));
    console.log(`  ${chalk.dim('ID:')}           ${svc.id}`);
    console.log(`  ${chalk.dim('Name:')}         ${chalk.white(svc.name)}`);
    console.log(`  ${chalk.dim('Slug:')}         ${svc.slug}`);
    console.log(`  ${chalk.dim('Status:')}       ${statusFn(svc.status)}`);
    console.log(`  ${chalk.dim('Node:')}         ${svc.node?.name || 'Aero Cloud'} (${svc.node?.status || 'unknown'})`);
    console.log(`  ${chalk.dim('Git:')}          ${svc.git_repository || 'N/A'} (${svc.git_branch || 'N/A'})`);
    console.log(`  ${chalk.dim('Domains:')}      ${svc.domains?.map((d: any) => d.domain).join(', ') || 'N/A'}`);
    console.log(`  ${chalk.dim('Created:')}      ${new Date(svc.created_at).toLocaleString()}`);
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to load service.`));
    p.log.error(err.message);
  }
}
