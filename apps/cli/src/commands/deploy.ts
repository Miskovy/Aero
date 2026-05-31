/**
 * deploy.ts — Deploy an existing service.
 *
 * Uses requireAuth guard and icons system.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest, requireAuth } from '../api/api.js';
import icons from '../utils/icons.js';

export async function deployAction() {
  if (!requireAuth()) return;

  p.intro(chalk.bgMagenta.black(' DEPLOYMENT '));

  const sFetch = p.spinner();
  sFetch.start('Loading your services...');

  let services: any[] = [];
  try {
    services = await apiRequest<any[]>({ method: 'GET', url: '/services' });
    sFetch.stop(`${icons.success} Services loaded!`);
  } catch (err: any) {
    sFetch.stop(chalk.red(`${icons.error} Failed to load services`));
    p.log.error(err.message);
    p.outro(chalk.gray('Returning to menu...'));
    await setTimeout(1500);
    return;
  }

  if (!services || services.length === 0) {
    p.outro(chalk.yellow('You have no services available to deploy.'));
    await setTimeout(1500);
    return;
  }

  const options = services.map((srv) => ({
    value: srv.id,
    label: `${srv.name} (${srv.project?.name || 'Unknown Project'}) - ${srv.type}`,
  }));
  options.push({ value: 'cancel', label: `${icons.cancel} Cancel` });

  const serviceId = await p.select({
    message: 'Select the service you want to deploy:',
    options,
  });

  if (p.isCancel(serviceId) || serviceId === 'cancel') {
    p.outro(chalk.gray('Deployment cancelled.'));
    return;
  }

  const confirm = await p.confirm({
    message: 'Are you sure you want to trigger a deployment for this service?',
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.outro(chalk.gray('Deployment aborted.'));
    return;
  }

  const s = p.spinner();
  s.start('Initiating deployment...');

  try {
    const response = await apiRequest<any>({
      method: 'POST',
      url: `/services/${serviceId}/deployments`,
    });

    s.stop(chalk.green(`${icons.success} Deployment triggered successfully!`));

    p.note(
      `Deployment ID: ${chalk.bold.yellow(response.id || 'N/A')}\nStatus: ${chalk.blue(response.status || 'queued')}`,
      'Deployment Details',
    );

    p.outro(`Check the deployment status in the 'Logs' menu.`);
    await setTimeout(2000);
  } catch (error: any) {
    s.stop(chalk.red(`${icons.error} Failed to trigger deployment`));
    p.log.error(error.message || 'An unknown error occurred.');
    p.outro(chalk.gray('Returning to menu...'));
    await setTimeout(1500);
  }
}
