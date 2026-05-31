/**
 * logs.ts — Deployment logs and runtime log streaming commands.
 *
 * Fixes:
 *   - All emojis replaced with icons system
 *   - Missing try/catch around status details, rollback, cancel
 *   - Auth guard on entry
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest, apiClient, requireAuth } from '../api/api.js';
import { statusDot } from '../ui/render.js';
import { io } from 'socket.io-client';
import icons from '../utils/icons.js';
import ConfigManager from '../utils/config.js';

// ─── Docker Log Cleaner ──────────────────────────────────────────────────────

function cleanDockerLogChunk(chunk: string): string {
  let cleaned = chunk;

  if (cleaned.length >= 8) {
    const firstByte = cleaned.charCodeAt(0);
    if (firstByte === 1 || firstByte === 2) {
      cleaned = cleaned.substring(8);
    }
  }

  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  return cleaned;
}

// ─── Phase Icons (safe Unicode) ──────────────────────────────────────────────

function phaseIcon(phase: string): string {
  switch (phase) {
    case 'clone':        return chalk.cyan(icons.clone);
    case 'build':        return chalk.blue(icons.build);
    case 'deploy':       return chalk.yellow(icons.deploy);
    case 'health_check': return chalk.magenta(icons.healthCheck);
    case 'routing':      return chalk.green(icons.routing);
    case 'completed':    return chalk.green(icons.success);
    case 'failed':       return chalk.red(icons.error);
    default:             return chalk.gray(icons.dot);
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

// ─── Runtime Log Watcher (WebSocket) ─────────────────────────────────────────

export async function watchRuntimeLogs(serviceId: string) {
  console.log('');
  console.log(chalk.green.bold(`  ${icons.runtime} Live Container Runtime Logs`));
  console.log(chalk.dim(`  ${icons.separator.repeat(60)}`));
  console.log(chalk.dim('  Press Ctrl+C to return to menu'));
  console.log('');

  return new Promise<void>((resolve) => {
    const baseUrl = ConfigManager.get('apiUrl');
    const socketUrl = `${baseUrl}/logs`;
    const socket = io(socketUrl, {
      reconnection: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('subscribe:logs', { serviceId });
    });

    socket.on(`log:${serviceId}`, (data: { message: string }) => {
      const cleaned = cleanDockerLogChunk(data.message);
      process.stdout.write(cleaned);
    });

    socket.on('disconnect', () => {
      resolve();
    });

    socket.on('connect_error', (err) => {
      console.log(chalk.red(`\n[ERROR] Logs gateway connection failed: ${err.message}`));
      socket.close();
      resolve();
    });

    const handleSigint = () => {
      socket.close();
      process.removeListener('SIGINT', handleSigint);
      console.log(chalk.gray('\nStopped watching runtime logs.'));
      resolve();
    };

    process.on('SIGINT', handleSigint);
  });
}

// ─── Deployment Log Watcher (Polling) ────────────────────────────────────────

const TERMINAL_STATUSES = ['completed', 'running', 'failed', 'cancelled', 'rolled_back'];

export async function watchDeploymentLogs(serviceId: string, deploymentId: string) {
  let lastLogCount = 0;
  let lastStatus = '';
  const shortId = deploymentId.substring(0, 8);

  console.log('');
  console.log(chalk.cyan.bold(`  ${icons.brand} Live Deployment Logs — ${shortId}`));
  console.log(chalk.dim(`  ${icons.separator.repeat(60)}`));
  console.log(chalk.dim('  Press Ctrl+C to stop watching'));
  console.log('');

  while (true) {
    try {
      const details = await apiRequest<any>({
        method: 'GET',
        url: `/services/${serviceId}/deployments/${deploymentId}`,
      });

      const logs = details.logs || [];
      const currentStatus = details.status;

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

        const lines = (log.message || '').split('\n');
        if (log.level === 'debug' && log.phase === 'build') {
          for (const line of lines) {
            if (line.trim()) {
              console.log(`  ${chalk.dim(time)}  ${chalk.dim('|')}  ${chalk.gray(line)}`);
            }
          }
        } else {
          console.log(`  ${chalk.dim(time)}  ${icon}  ${color(lines[0])}`);
        }
      }
      lastLogCount = logs.length;

      if (TERMINAL_STATUSES.includes(currentStatus) && currentStatus !== lastStatus) {
        console.log('');
        if (currentStatus === 'completed' || currentStatus === 'running') {
          console.log(chalk.green.bold(`  ${icons.success} Deployment completed successfully!`));
          if (details.service?.domains?.length > 0) {
            const domain = details.service.domains[0]?.domain;
            if (domain) {
              console.log(chalk.cyan(`  ${icons.domain} https://${domain}`));
            }
          }
        } else if (currentStatus === 'failed') {
          console.log(chalk.red.bold(`  ${icons.error} Deployment failed.`));
        } else if (currentStatus === 'cancelled') {
          console.log(chalk.yellow.bold(`  ${icons.warning} Deployment was cancelled.`));
        } else if (currentStatus === 'rolled_back') {
          console.log(chalk.yellow.bold(`  ${icons.rollback} Deployment was rolled back.`));
        }
        console.log('');
        break;
      }

      lastStatus = currentStatus;
    } catch (err: any) {
      console.log(chalk.dim(`  ${icons.warning} Connection lost, retrying... (${err.message})`));
    }

    await setTimeout(2000);
  }
}

// ─── Main Logs Action ────────────────────────────────────────────────────────

export async function logsAction(initialServiceId?: string) {
  if (!requireAuth()) return;

  p.intro(chalk.bgCyan.black(' DEPLOYMENTS & LOGS '));

  let serviceId = initialServiceId;

  if (!serviceId) {
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
      p.outro(chalk.yellow('You have no services.'));
      await setTimeout(1500);
      return;
    }

    const serviceSelect = await p.select({
      message: 'Select the service to view deployments for:',
      options: [
        ...services.map((srv) => ({
          value: srv.id,
          label: `${srv.name} (${srv.project?.name || 'Unknown'})`,
        })),
        { value: 'cancel', label: `${icons.cancel} Back to Menu` },
      ],
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
      url: `/services/${serviceId}/deployments?limit=10`,
    });

    s.stop(`${icons.success} Deployments retrieved!`);

    if (!deployments || deployments.length === 0) {
      p.outro(chalk.yellow('No deployments found for this service.'));
      await setTimeout(1500);
      return;
    }

    const deploymentId = await p.select({
      message: 'Select a deployment to view details/actions:',
      options: [
        ...deployments.map((dep) => {
          const dateStr = dep.created_at ? new Date(dep.created_at).toLocaleString() : 'Unknown Date';
          const dot = statusDot(dep.status);
          return {
            value: dep.id,
            label: `${dot} ${dep.id.substring(0, 8)} — ${dep.status} (${dateStr})`,
          };
        }),
        { value: 'cancel', label: `${icons.cancel} Cancel` },
      ],
    });

    if (p.isCancel(deploymentId) || deploymentId === 'cancel') {
      p.outro(chalk.gray('Returning to menu...'));
      return;
    }

    const action = await p.select({
      message: `What would you like to do for deployment ${chalk.cyan((deploymentId as string).substring(0, 8))}?`,
      options: [
        { value: 'runtime', label: `${icons.runtime} Watch Live Runtime Logs (Container stdout)` },
        { value: 'watch', label: `${icons.logs} Watch Deployment Build Logs` },
        { value: 'status', label: `${icons.inspect} View Status Details` },
        { value: 'rollback', label: `${icons.rollback} Rollback to this deployment` },
        { value: 'cancel_deploy', label: `${icons.cancel} Cancel Deployment` },
        { value: 'back', label: `${icons.back} Back` },
      ],
    });

    if (p.isCancel(action) || action === 'back') return;

    if (action === 'runtime') {
      await watchRuntimeLogs(serviceId!);
      await p.text({ message: 'Press Enter to continue...' });

    } else if (action === 'watch') {
      await watchDeploymentLogs(serviceId!, deploymentId as string);
      await p.text({ message: 'Press Enter to continue...' });

    } else if (action === 'status') {
      const ts = p.spinner();
      ts.start('Fetching details...');
      try {
        const details = await apiRequest({
          method: 'GET',
          url: `/services/${serviceId}/deployments/${deploymentId}`,
        });
        ts.stop(`${icons.success} Details retrieved`);

        const d = details as any;
        const logEntries = (d.logs || []) as any[];

        console.log('');
        console.log(chalk.bold(`  Deployment ${chalk.cyan(d.id?.substring(0, 8))}`));
        console.log(chalk.dim(`  ${icons.separator.repeat(45)}`));
        console.log(`  Status:     ${statusDot(d.status)} ${d.status}`);
        console.log(`  Trigger:    ${d.trigger}`);
        console.log(`  Created:    ${new Date(d.created_at).toLocaleString()}`);
        if (d.started_at) console.log(`  Started:    ${new Date(d.started_at).toLocaleString()}`);
        if (d.finished_at) console.log(`  Finished:   ${new Date(d.finished_at).toLocaleString()}`);
        if (d.git_commit_sha) console.log(`  Commit:     ${d.git_commit_sha.substring(0, 7)}`);
        console.log('');

        if (logEntries.length > 0) {
          console.log(chalk.bold('  Build Log'));
          console.log(chalk.dim(`  ${icons.separator.repeat(45)}`));
          for (const log of logEntries) {
            const icon = phaseIcon(log.phase);
            const color = phaseColor(log.phase);
            const time = new Date(log.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            });
            console.log(`  ${chalk.dim(time)}  ${icon}  ${color(log.message)}`);
          }
          console.log('');
        }

        await p.text({ message: 'Press Enter to continue...' });
      } catch (err: any) {
        ts.stop(chalk.red(`${icons.error} Failed to fetch details`));
        p.log.error(err.message);
      }

    } else if (action === 'rollback') {
      const ts = p.spinner();
      ts.start('Triggering rollback...');
      try {
        await apiRequest({
          method: 'POST',
          url: `/services/${serviceId}/deployments/${deploymentId}/rollback`,
        });
        ts.stop(chalk.green(`${icons.success} Rollback triggered successfully!`));
      } catch (err: any) {
        ts.stop(chalk.red(`${icons.error} Failed to trigger rollback`));
        p.log.error(err.message);
      }
      await setTimeout(1500);

    } else if (action === 'cancel_deploy') {
      const ts = p.spinner();
      ts.start('Cancelling deployment...');
      try {
        await apiRequest({
          method: 'POST',
          url: `/services/${serviceId}/deployments/${deploymentId}/cancel`,
        });
        ts.stop(chalk.green(`${icons.success} Deployment cancelled.`));
      } catch (err: any) {
        ts.stop(chalk.red(`${icons.error} Failed to cancel deployment`));
        p.log.error(err.message);
      }
      await setTimeout(1500);
    }
  } catch (error: any) {
    s.stop(chalk.red(`${icons.error} Error fetching deployments`));
    p.log.error(error.message || 'An unknown error occurred.');
    p.outro(chalk.gray('Returning to menu...'));
    await setTimeout(1500);
  }
}
