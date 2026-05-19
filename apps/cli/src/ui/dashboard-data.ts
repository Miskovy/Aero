import { apiRequest, cliState } from '../api/api.js';
import { formatUptime, timeAgo, statusDot } from './render.js';
import chalk from 'chalk';

export interface DashboardData {
  userName: string;
  userEmail: string;
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
  const result: DashboardData = {
    userName: 'User',
    userEmail: '',
    health: null,
    services: { total: 0, running: 0, failed: 0, deploying: 0, stopped: 0 },
    nodes: [],
    recentActivity: [],
  };

  // Decode user info from JWT token (no API call needed)
  if (cliState.token) {
    const payload = decodeJwtPayload(cliState.token);
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

  // Health
  if (healthResult.status === 'fulfilled') {
    result.health = healthResult.value as DashboardData['health'];
  }

  // Services summary
  if (servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value)) {
    const svcs = servicesResult.value;
    result.services.total = svcs.length;
    result.services.running = svcs.filter((s: any) => s.status === 'running').length;
    result.services.failed = svcs.filter((s: any) => s.status === 'failed').length;
    result.services.deploying = svcs.filter((s: any) =>
      ['deploying', 'building', 'queued'].includes(s.status)
    ).length;
    result.services.stopped = svcs.filter((s: any) => s.status === 'stopped').length;

    // Build recent activity from services with latest deployments
    for (const svc of svcs.slice(0, 5)) {
      if (svc.deployments && svc.deployments.length > 0) {
        const dep = svc.deployments[0];
        const action = dep.status === 'completed' ? 'deployed' :
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
  if (nodesResult.status === 'fulfilled' && Array.isArray(nodesResult.value)) {
    result.nodes = nodesResult.value.map((n: any) => ({
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
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone?.split('/').pop() || '';

  const healthItems = data.health ? [
    { label: 'Status', value: data.health.status === 'healthy' ? chalk.green('Healthy') : chalk.red('Degraded'), dot: statusDot(data.health.status) },
    { label: 'Database', value: data.health.database === 'connected' ? chalk.green('Connected') : chalk.red('Down'), dot: statusDot(data.health.database) },
    { label: 'Redis', value: data.health.redis === 'connected' ? chalk.green('Connected') : chalk.red('Down'), dot: statusDot(data.health.redis) },
    { label: 'Docker', value: data.health.docker === 'connected' ? chalk.green('Connected') : chalk.red('Down'), dot: statusDot(data.health.docker) },
    { label: 'Uptime', value: chalk.white(formatUptime(data.health.uptime)), dot: chalk.cyan('◷') },
  ] : [
    { label: 'Status', value: chalk.red('Unavailable'), dot: statusDot('failed') },
  ];

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
