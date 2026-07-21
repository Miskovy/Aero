/**
 * dashboard-data.ts — Dashboard data fetching and layout building.
 *
 * Uses ConfigManager instead of raw cliState.
 * System Status panel shows:
 *   - Local machine specs (CPU name, RAM, cores) — from Node.js os module
 *   - Aero CLI resource usage (process memory)
 *   - Account info (email)
 *   - API connectivity
 *   - Nodes summary (online / total)
 */

import * as os from 'node:os';
import { apiRequest, unwrapData } from '../api/api.js';
import { formatBytes, timeAgo } from './render.js';
import ConfigManager from '../utils/config.js';
import icons from '../utils/icons.js';
import chalk from 'chalk';

export interface DashboardData {
  userName: string;
  userEmail: string;
  /** Local machine info from Node.js os module */
  machine: {
    cpuModel: string;
    cpuCores: number;
    totalMemory: number;
    freeMemory: number;
    platform: string;
    hostname: string;
  };
  /** Aero CLI process resource usage */
  processMemory: number;
  health: {
    status: string;
    uptime: number;
    database: string;
    redis: string;
    docker: string;
    version: string;
  } | null;
  services: {
    total: number;
    running: number;
    failed: number;
    deploying: number;
    stopped: number;
  };
  nodes: { name: string; status: string }[];
  recentActivity: { message: string; time: string }[];
}

/** Decode JWT payload without verification (for display only) */
function decodeJwtPayload(token: string): { sub?: string; email?: string; name?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload) as { sub?: string; email?: string; name?: string };
  } catch {
    return null;
  }
}

/** Fetch all dashboard data in parallel from the API */
export async function fetchDashboardData(): Promise<DashboardData> {
  // ── Collect local machine info (no API call — instant) ──
  const cpus = os.cpus();

  const result: DashboardData = {
    userName: 'User',
    userEmail: '',
    machine: {
      cpuModel: cpus.length > 0 ? cpus[0].model.trim() : 'Unknown',
      cpuCores: cpus.length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      platform: `${os.type()} ${os.release()}`,
      hostname: os.hostname(),
    },
    processMemory: process.memoryUsage().rss,
    health: null,
    services: { total: 0, running: 0, failed: 0, deploying: 0, stopped: 0 },
    nodes: [],
    recentActivity: [],
  };

  // Decode user info from JWT token (no API call needed)
  const token = ConfigManager.get('token');
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload) {
      result.userName = payload.name || payload.email || 'User';
      result.userEmail = payload.email || '';
    }
  }

  // Fetch all data in parallel — gracefully handle failures
  const [healthResult, servicesResult, nodesResult] = await Promise.allSettled([
    apiRequest<any>({ method: 'GET', url: '/system/health' }),
    apiRequest<any[]>({ method: 'GET', url: '/services' }),
    apiRequest<any[]>({ method: 'GET', url: '/nodes' }),
  ]);

  // Health (lightweight connectivity check)
  if (healthResult.status === 'fulfilled') {
    result.health = healthResult.value as DashboardData['health'];
  }

  // Services summary
  if (servicesResult.status === 'fulfilled') {
    const svcs = unwrapData(servicesResult.value);
    result.services.total = svcs.length;
    result.services.running = svcs.filter((s: any) => s.status === 'running').length;
    result.services.failed = svcs.filter((s: any) => s.status === 'failed').length;
    result.services.deploying = svcs.filter((s: any) =>
      ['deploying', 'building', 'queued'].includes(s.status),
    ).length;
    result.services.stopped = svcs.filter((s: any) => s.status === 'stopped').length;

    // Build recent activity from services with latest deployments
    for (const svc of svcs.slice(0, 5)) {
      if (svc.deployments && svc.deployments.length > 0) {
        const dep = svc.deployments[0];
        const action =
          dep.status === 'completed' ? 'deployed' :
            dep.status === 'failed' ? 'build failed' :
              dep.status === 'queued' ? 'queued' :
                dep.status === 'building' ? 'building' : dep.status;
        result.recentActivity.push({
          message: `${svc.name} ${action}`,
          time: timeAgo(dep.created_at),
        });
      } else {
        result.recentActivity.push({
          message: `${svc.name} created`,
          time: timeAgo(svc.created_at),
        });
      }
    }
  }

  // Nodes
  if (nodesResult.status === 'fulfilled') {
    result.nodes = unwrapData(nodesResult.value).map((n: any) => ({
      name: n.name || n.hostname || n.id?.substring(0, 12) || 'unknown',
      status: n.status || 'offline',
    }));
  }

  return result;
}

/** Convert DashboardData into the layout format expected by renderDashboard */
export function buildDashboardLayout(data: DashboardData) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value || '';

  // ── Build user-centric status panel ──
  const nodesOnline = data.nodes.filter((n) => n.status === 'online').length;
  const nodesTotal = data.nodes.length;
  const usedMemory = data.machine.totalMemory - data.machine.freeMemory;
  const memPercent = data.machine.totalMemory > 0
    ? (usedMemory / data.machine.totalMemory) * 100
    : 0;

  const healthItems: { label: string; value: string; dot: string }[] = [];

  // Local machine specs
  healthItems.push({
    label: 'Machine',
    value: chalk.white(data.machine.hostname),
    dot: chalk.cyan(icons.dot),
  });

  healthItems.push({
    label: 'CPU',
    value: chalk.white(data.machine.cpuModel) + chalk.dim(` (${data.machine.cpuCores} cores)`),
    dot: chalk.cyan(icons.dot),
  });

  healthItems.push({
    label: 'RAM',
    value: `${chalk.white(formatBytes(usedMemory))} / ${chalk.dim(formatBytes(data.machine.totalMemory))}` +
      chalk.dim(` (${memPercent.toFixed(0)}%)`),
    dot: memPercent >= 90 ? chalk.red(icons.dot) : memPercent >= 70 ? chalk.yellow(icons.dot) : chalk.green(icons.dot),
  });

  healthItems.push({
    label: 'Aero CLI',
    value: chalk.dim(formatBytes(data.processMemory) + ' memory'),
    dot: chalk.cyan(icons.dot),
  });

  // API connectivity
  if (data.health) {
    const isHealthy = data.health.status === 'healthy';
    healthItems.push({
      label: 'API',
      value: isHealthy ? chalk.green('Connected') : chalk.yellow('Degraded'),
      dot: isHealthy ? chalk.green(icons.dot) : chalk.yellow(icons.dot),
    });
  } else {
    healthItems.push({
      label: 'API',
      value: chalk.yellow('Connecting...'),
      dot: chalk.yellow(icons.dot),
    });
  }

  // Nodes summary
  if (nodesTotal > 0) {
    const nodesColor = nodesOnline === nodesTotal ? chalk.green : nodesOnline > 0 ? chalk.yellow : chalk.red;
    healthItems.push({
      label: 'Nodes',
      value: nodesColor(`${nodesOnline} online`) + chalk.dim(` / ${nodesTotal} total`),
      dot: nodesColor(icons.dot),
    });
  } else {
    healthItems.push({
      label: 'Nodes',
      value: chalk.dim('None connected'),
      dot: chalk.gray(icons.dot),
    });
  }

  const serviceItems = [
    { label: 'Total', value: chalk.white(String(data.services.total)) },
    { label: 'Running', value: data.services.running > 0 ? chalk.green(String(data.services.running)) : chalk.dim('0') },
    { label: 'Failed', value: data.services.failed > 0 ? chalk.red(String(data.services.failed)) : chalk.dim('0') },
    { label: 'Deploying', value: data.services.deploying > 0 ? chalk.yellow(String(data.services.deploying)) : chalk.dim('0') },
    { label: 'Stopped', value: data.services.stopped > 0 ? chalk.gray(String(data.services.stopped)) : chalk.dim('0') },
  ];

  return {
    header: `Welcome back, ${chalk.bold.cyan(data.userName)}!`,
    time: `${timeStr} ${tzName}`,
    health: healthItems,
    services: serviceItems,
    nodes: data.nodes,
    activity: data.recentActivity,
  };
}
