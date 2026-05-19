import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest } from '../api/api.js';
import { statusDot } from '../ui/render.js';

// ─── Phase Colors ────────────────────────────────────────────────────────────

function phaseIcon(phase: string): string {
  switch (phase) {
    case 'clone':        return chalk.cyan('⬇');
    case 'build':        return chalk.blue('🔨');
    case 'deploy':       return chalk.yellow('🚀');
    case 'health_check': return chalk.magenta('💓');
    case 'routing':      return chalk.green('🔗');
    case 'completed':    return chalk.green('✅');
    case 'failed':       return chalk.red('❌');
    default:             return chalk.gray('●');
  }
}

function phaseColor(phase: string): (str: string) => string {
  switch (phase) {
    case 'clone':        return chalk.cyan;
    case 'build':        return chalk.blue;
    case 'deploy':       return chalk.yellow;
    case 'health_check': return chalk.magenta;
    case 'routing':      return chalk.green;
    case 'completed':    return chalk.green;
    case 'failed':       return chalk.red;
    default:             return chalk.gray;
  }
}

// ─── Live Log Watcher ────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'rolled_back'];

export async function watchDeploymentLogs(serviceId: string, deploymentId: string) {
  let lastLogCount = 0;
  let lastStatus = '';
  const shortId = deploymentId.substring(0, 8);

  console.log('');
  console.log(chalk.cyan.bold(`  ◆ Live Deployment Logs — ${shortId}`));
  console.log(chalk.dim(`  ${'─'.repeat(50)}`));
  console.log('');

  while (true) {
    try {
      const details = await apiRequest<any>({
        method: 'GET',
        url: `/services/${serviceId}/deployments/${deploymentId}`,
      });

      const logs = details.logs || [];
      const currentStatus = details.status;

      // Print new log entries
      for (let i = lastLogCount; i < logs.length; i++) {
        const log = logs[i];
        const icon = phaseIcon(log.phase);
        const color = phaseColor(log.phase);
        const time = new Date(log.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        console.log(`  ${chalk.dim(time)}  ${icon}  ${color(log.message)}`);
      }
      lastLogCount = logs.length;

      // Check if deployment reached terminal state
      if (TERMINAL_STATUSES.includes(currentStatus) && currentStatus !== lastStatus) {
        console.log('');
        if (currentStatus === 'completed') {
          console.log(chalk.green.bold('  ✅ Deployment completed successfully!'));

          // Show domain if available
          if (details.service?.domains?.length > 0) {
            const domain = details.service.domains[0]?.domain;
            if (domain) {
              console.log(chalk.cyan(`  🌐 https://${domain}`));
            }
          }
        } else if (currentStatus === 'failed') {
          console.log(chalk.red.bold('  ❌ Deployment failed.'));
        } else if (currentStatus === 'cancelled') {
          console.log(chalk.yellow.bold('  ⚠ Deployment was cancelled.'));
        } else if (currentStatus === 'rolled_back') {
          console.log(chalk.yellow.bold('  ⏪ Deployment was rolled back.'));
        }
        console.log('');
        break;
      }

      lastStatus = currentStatus;

    } catch (err: any) {
      console.log(chalk.dim(`  ⚠ Connection lost, retrying... (${err.message})`));
    }

    await setTimeout(2000);
  }
}

// ─── Main Logs Action ────────────────────────────────────────────────────────

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
            const dot = statusDot(dep.status);
            return {
                value: dep.id,
                label: `${dot} ${dep.id.substring(0, 8)} — ${dep.status} (${dateStr})`
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
        { value: 'watch', label: '📺 Watch Live Logs' },
        { value: 'status', label: '📋 View Status Details' },
        { value: 'rollback', label: '⏪ Rollback to this deployment' },
        { value: 'cancel', label: '❌ Cancel Deployment' },
        { value: 'back', label: '⬅ Back' }
      ]
    });

    if (p.isCancel(action) || action === 'back') return;

    if (action === 'watch') {
      await watchDeploymentLogs(serviceId!, deploymentId as string);
      await p.text({ message: 'Press Enter to continue...' });

    } else if (action === 'status') {
      const ts = p.spinner();
      ts.start('Fetching details...');
      const details = await apiRequest({
        method: 'GET',
        url: `/services/${serviceId}/deployments/${deploymentId}`
      });
      ts.stop('Details retrieved');

      // Render nicely instead of raw JSON
      const d = details as any;
      const logEntries = (d.logs || []) as any[];

      console.log('');
      console.log(chalk.bold(`  Deployment ${chalk.cyan(d.id?.substring(0, 8))}`));
      console.log(chalk.dim(`  ${'─'.repeat(45)}`));
      console.log(`  Status:     ${statusDot(d.status)} ${d.status}`);
      console.log(`  Trigger:    ${d.trigger}`);
      console.log(`  Created:    ${new Date(d.created_at).toLocaleString()}`);
      if (d.started_at) console.log(`  Started:    ${new Date(d.started_at).toLocaleString()}`);
      if (d.finished_at) console.log(`  Finished:   ${new Date(d.finished_at).toLocaleString()}`);
      if (d.git_commit_sha) console.log(`  Commit:     ${d.git_commit_sha.substring(0, 7)}`);
      console.log('');

      if (logEntries.length > 0) {
        console.log(chalk.bold('  Build Log'));
        console.log(chalk.dim(`  ${'─'.repeat(45)}`));
        for (const log of logEntries) {
          const icon = phaseIcon(log.phase);
          const color = phaseColor(log.phase);
          const time = new Date(log.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          });
          console.log(`  ${chalk.dim(time)}  ${icon}  ${color(log.message)}`);
        }
        console.log('');
      }

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
