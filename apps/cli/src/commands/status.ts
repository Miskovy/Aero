import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest } from '../api/api.js';

export async function statusAction() {
  const s = p.spinner();
  s.start('Fetching system health...');

  try {
    const health = await apiRequest({ method: 'GET', url: '/system/health' });

    s.stop('System health retrieved');

    p.log.info(chalk.bold('System Status'));
    p.log.step(`Status: ${health.status === 'healthy' ? chalk.green('HEALTHY') : chalk.red('DEGRADED')}`);
    p.log.step(`Uptime: ${health.uptime}s`);
    p.log.step(`Version: ${health.version}`);
    
    p.log.info(chalk.bold('\nServices'));
    
    const dbStatus = health.database === 'connected' ? chalk.green('UP') : chalk.red('DOWN');
    p.log.step(`Database: ${dbStatus}`);
    
    const redisStatus = health.redis === 'connected' ? chalk.green('UP') : chalk.red('DOWN');
    p.log.step(`Redis: ${redisStatus}`);
    
    const dockerStatus = health.docker === 'connected' ? chalk.green('UP') : chalk.red('DOWN');
    p.log.step(`Docker: ${dockerStatus}`);

  } catch (error: unknown) {
    s.stop('Failed to retrieve system health');
    const err = error as { response?: { data?: { message?: string } }, message?: string };
    p.log.error(err.response?.data?.message || err.message || 'An unknown error occurred.');
  }
}
