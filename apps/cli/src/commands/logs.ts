import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest } from '../api/api.js';

export async function logsAction(initialServiceId?: string) {
  p.intro(chalk.bgCyan.black(' DEPLOYMENTS & LOGS '));

  let serviceId = initialServiceId;

  if (!serviceId) {
    const sFetch = p.spinner();
    sFetch.start('Loading your services...');

    let services: any[] = [];
    try {
      services = await apiRequest<any[]>({
        method: 'GET',
        url: `/services`
      });
      sFetch.stop('Services loaded!');
    } catch (err: any) {
      sFetch.stop(chalk.red('Failed to load services'));
      p.log.error(err.message);
      p.outro(chalk.gray('Returning to menu...'));
      await setTimeout(1500);
      return;
    }

    if (!services || services.length === 0) {
      p.outro(chalk.yellow('You have no services.'));
      await setTimeout(1500);
      return;
    }

    const serviceSelect = await p.select({
      message: 'Select the service to view deployments for:',
      options: [
        ...services.map(srv => ({
          value: srv.id,
          label: `${srv.name} (${srv.project?.name || 'Unknown'})`
        })),
        { value: 'cancel', label: '❌ Back to Menu' }
      ]
    });

    if (p.isCancel(serviceSelect) || serviceSelect === 'cancel') {
      p.outro(chalk.gray('Returning to menu...'));
      return;
    }
    
    serviceId = serviceSelect as string;
  }

  const s = p.spinner();
  s.start('Fetching deployments for your service...');

  try {
    const deployments = await apiRequest<any[]>({
      method: 'GET',
      url: `/services/${serviceId}/deployments?limit=10`
    });

    s.stop('Deployments retrieved!');

    if (!deployments || deployments.length === 0) {
      p.outro(chalk.yellow('No deployments found for this service.'));
      await setTimeout(1500);
      return;
    }

    const deploymentId = await p.select({
      message: 'Select a deployment to view details/actions:',
      options: [
        ...deployments.map(dep => {
            const dateStr = dep.created_at ? new Date(dep.created_at).toLocaleString() : 'Unknown Date';
            return {
                value: dep.id,
                label: `${dep.id.substring(0, 8)} - ${dep.status} (${dateStr})`
            }
        }),
        { value: 'cancel', label: '❌ Cancel' }
      ]
    });

    if (p.isCancel(deploymentId) || deploymentId === 'cancel') {
      p.outro(chalk.gray('Returning to menu...'));
      return;
    }

    const action = await p.select({
      message: `What would you like to do for deployment ${chalk.cyan((deploymentId as string).substring(0, 8))}?`,
      options: [
        { value: 'status', label: '�� View Status Details' },
        { value: 'rollback', label: '⏪ Rollback to this deployment' },
        { value: 'cancel', label: '❌ Cancel Deployment' },
        { value: 'back', label: '⬅ Back' }
      ]
    });

    if (p.isCancel(action) || action === 'back') return;

    if (action === 'status') {
      const ts = p.spinner();
      ts.start('Fetching details...');
      const details = await apiRequest({
        method: 'GET',
        url: `/services/${serviceId}/deployments/${deploymentId}`
      });
      ts.stop('Details retrieved');
      p.note(JSON.stringify(details, null, 2), 'Deployment Details');
      await p.text({ message: 'Press Enter to continue...' });

    } else if (action === 'rollback') {
      const ts = p.spinner();
      ts.start('Triggering rollback...');
      await apiRequest({
        method: 'POST',
        url: `/services/${serviceId}/deployments/${deploymentId}/rollback`
      });
      ts.stop(chalk.green('Rollback triggered successfully!'));
      await setTimeout(1500);

    } else if (action === 'cancel') {
      const ts = p.spinner();
      ts.start('Cancelling deployment...');
      await apiRequest({
        method: 'POST',
        url: `/services/${serviceId}/deployments/${deploymentId}/cancel`
      });
      ts.stop(chalk.green('Deployment cancelled.'));
      await setTimeout(1500);
    }
  } catch (error: any) {
    s.stop(chalk.red('Error fetching deployments'));
    p.log.error(error.message || 'An unknown error occurred.');
    p.outro(chalk.gray('Returning to menu...'));
    await setTimeout(1500);
  }
}
