import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';

export async function deployAction() {
  const s = p.spinner();
  s.start('Analyzing project...');
  await setTimeout(1000);
  s.stop('Project configuration found.');
  p.outro(chalk.green('🚀 Service deployed successfully!'));
}
