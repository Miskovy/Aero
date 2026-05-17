import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest } from '../api/api.js';

export async function servicesListAction() {
  const s = p.spinner();
  s.start('Fetching services...');
  try {
    const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
    s.stop('Services loaded!');
    
    if (!services || services.length === 0) {
      p.log.info('No services found.');
      return;
    }

    console.log('\nID                                   NAME            STATUS       TYPE');
    console.log('--------------------------------------------------------------------------------');
    for (const svc of services) {
      const statusColor = svc.status === 'running' ? chalk.green : svc.status === 'failed' ? chalk.red : chalk.yellow;
      console.log(`${svc.id.padEnd(36)} ${svc.name.padEnd(15)} ${statusColor((svc.status || 'unknown').padEnd(12))} ${svc.source_type}`);
    }
    console.log();
  } catch (err: any) {
    s.stop('Failed to load services.');
    p.log.error(err.message);
  }
}

async function handleServiceLifecycle(action: 'start' | 'stop' | 'restart' | 'delete', serviceId?: string) {
    if (!serviceId) {
        const s = p.spinner();
        s.start('Loading services...');
        try {
            const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
            s.stop();
            if (!services || services.length === 0) {
                p.log.info('No services available.');
                return;
            }
            const selection = await p.select({
                message: `Select a service to ${action}:`,
                options: services.map(srv => ({ value: srv.id, label: `${srv.name} (${srv.status || 'unknown'})` }))
            });
            if (p.isCancel(selection)) return;
            serviceId = selection as string;
        } catch (err: any) {
            s.stop('Failed to load services.');
            return p.log.error(err.message);
        }
    }

    if (action === 'delete') {
        const confirm = await p.confirm({ message: 'Are you sure you want to delete this service?', initialValue: false });
        if (p.isCancel(confirm) || !confirm) return;
    }

    const s = p.spinner();
    s.start(`${action.charAt(0).toUpperCase() + action.slice(1)}ing service...`);
    try {
        if (action === 'delete') {
            await apiRequest({ method: 'DELETE', url: `/services/${serviceId}` });
        } else {
            await apiRequest({ method: 'POST', url: `/services/${serviceId}/${action}` });
        }
        s.stop(chalk.green(`Service successfully ${action}ed.`));
    } catch (err: any) {
        s.stop(chalk.red(`Failed to ${action} service.`));
        p.log.error(err.message);
    }
}

export const servicesStartAction = (id?: string) => handleServiceLifecycle('start', id);
export const servicesStopAction = (id?: string) => handleServiceLifecycle('stop', id);
export const servicesRestartAction = (id?: string) => handleServiceLifecycle('restart', id);
export const servicesDeleteAction = (id?: string) => handleServiceLifecycle('delete', id);

export async function servicesInspectAction(serviceId?: string) {
    if (!serviceId) {
        const s = p.spinner();
        s.start('Loading services...');
        try {
            const services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
            s.stop();
            if (!services || services.length === 0) {
                p.log.info('No services available.');
                return;
            }
            const selection = await p.select({
                message: `Select a service to inspect:`,
                options: services.map(srv => ({ value: srv.id, label: srv.name }))
            });
            if (p.isCancel(selection)) return;
            serviceId = selection as string;
        } catch (err: any) {
            s.stop('Failed to load services.');
            return p.log.error(err.message);
        }
    }

    const s = p.spinner();
    s.start('Inspecting service...');
    try {
        const svc = await apiRequest<any>({ method: 'GET', url: `/services/${serviceId}` });
        s.stop('Service loaded.');

        console.log(chalk.bold.blue('\nService Details'));
        console.log('-------------------------');
        console.log(`ID:           ${svc.id}`);
        console.log(`Name:         ${svc.name}`);
        console.log(`Slug:         ${svc.slug}`);
        console.log(`Status:       ${svc.status}`);
        console.log(`Node:         ${svc.node?.name || 'Aero Cloud'} (${svc.node?.status || 'unknown'})`);
        console.log(`Git:          ${svc.git_repository || 'N/A'} (${svc.git_branch || 'N/A'})`);
        console.log(`Domains:      ${svc.domains?.map((d: any) => d.domain).join(', ') || 'N/A'}`);
        console.log(`Created:      ${new Date(svc.created_at).toLocaleString()}`);
        console.log();
    } catch (err: any) {
        s.stop(chalk.red('Failed to load service.'));
        p.log.error(err.message);
    }
}
