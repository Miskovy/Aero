/**
 * status.ts — System status command.
 *
 * Shows actual machine/user metrics (CPU, RAM, disk, Docker containers)
 * from /system/metrics, plus infrastructure health from /system/health.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth } from '../api/api.js';
import icons from '../utils/icons.js';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function percentBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  let color: (str: string) => string;
  if (percent >= 90) color = chalk.red;
  else if (percent >= 70) color = chalk.yellow;
  else color = chalk.green;

  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ' ' + color(percent.toFixed(1) + '%');
}

export async function statusAction() {
  if (!requireAuth()) return;

  const s = p.spinner();
  s.start('Fetching system status...');

  try {
    // Fetch both metrics and health in parallel
    const [metricsResult, healthResult] = await Promise.allSettled([
      apiRequest<any>({ method: 'GET', url: '/system/metrics' }),
      apiRequest<any>({ method: 'GET', url: '/system/health' }),
    ]);

    s.stop(`${icons.success} System status retrieved`);

    // ── Machine Metrics ──
    if (metricsResult.status === 'fulfilled') {
      const m = metricsResult.value;

      console.log('');
      console.log(chalk.bold(`  ${icons.inspect} System Metrics`));
      console.log(chalk.dim(`  ${icons.separator.repeat(50)}`));

      console.log(`  ${chalk.dim('Hostname:')}    ${chalk.white(m.hostname)}`);
      console.log(`  ${chalk.dim('Uptime:')}      ${formatUptime(m.uptime)}`);
      console.log('');

      console.log(`  ${chalk.dim('CPU:')}         ${m.cpu.model}`);
      console.log(`  ${chalk.dim('             ')}${m.cpu.cores} cores  ${percentBar(m.cpu.usagePercent)}`);
      console.log('');

      console.log(`  ${chalk.dim('Memory:')}      ${formatBytes(m.memory.usedBytes)} / ${formatBytes(m.memory.totalBytes)}`);
      console.log(`  ${chalk.dim('             ')}${percentBar(m.memory.usagePercent)}`);
      console.log('');

      console.log(`  ${chalk.dim('Disk:')}        ${formatBytes(m.disk.usedBytes)} / ${formatBytes(m.disk.totalBytes)}`);
      console.log(`  ${chalk.dim('             ')}${percentBar(m.disk.usagePercent)}`);
      console.log('');

      console.log(chalk.bold(`  ${icons.node} Docker`));
      console.log(chalk.dim(`  ${icons.separator.repeat(50)}`));
      console.log(`  ${chalk.dim('Version:')}     ${chalk.white(m.docker.version)}`);
      console.log(`  ${chalk.dim('Running:')}     ${chalk.green(String(m.docker.containersRunning))} containers`);
      console.log(`  ${chalk.dim('Stopped:')}     ${chalk.gray(String(m.docker.containersStopped))} containers`);
      console.log(`  ${chalk.dim('Images:')}      ${chalk.white(String(m.docker.imagesCount))}`);
    } else {
      console.log('');
      console.log(chalk.yellow(`  ${icons.warning} System metrics unavailable`));
      console.log(chalk.dim(`  The /system/metrics endpoint could not be reached.`));
    }

    // ── Infrastructure Health ──
    console.log('');
    if (healthResult.status === 'fulfilled') {
      const health = healthResult.value;

      console.log(chalk.bold(`  ${icons.service} Infrastructure Health`));
      console.log(chalk.dim(`  ${icons.separator.repeat(50)}`));

      const statusLabel = health.status === 'healthy' ? chalk.green('HEALTHY') : chalk.red('DEGRADED');
      console.log(`  ${chalk.dim('Status:')}      ${statusLabel}`);

      const dbStatus = health.database === 'connected' ? chalk.green('UP') : chalk.red('DOWN');
      const redisStatus = health.redis === 'connected' ? chalk.green('UP') : chalk.red('DOWN');
      const dockerStatus = health.docker === 'connected' ? chalk.green('UP') : chalk.red('DOWN');

      console.log(`  ${chalk.dim('Database:')}    ${dbStatus}`);
      console.log(`  ${chalk.dim('Redis:')}       ${redisStatus}`);
      console.log(`  ${chalk.dim('Docker:')}      ${dockerStatus}`);
      console.log(`  ${chalk.dim('Version:')}     ${health.version}`);
    } else {
      console.log(chalk.yellow(`  ${icons.warning} Infrastructure health unavailable`));
    }

    console.log('');
  } catch (error: any) {
    s.stop(`${icons.error} Failed to retrieve system status`);
    p.log.error(error.message || 'An unknown error occurred.');
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
