import chalk from 'chalk';

export async function logsAction(serviceId?: string) {
  console.log(chalk.blue(`Fetching logs${serviceId ? ` for service ${serviceId}` : ''}...`));
  
  // Simulate showing logs
  console.log(chalk.gray('2026-04-25 10:00:00 [api] App started'));
  console.log(chalk.gray('2026-04-25 10:00:01 [api] Listening on :3000'));
}
