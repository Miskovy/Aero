import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';

export async function loginAction() {
  const email = await p.text({ message: 'Email address:', placeholder: 'admin@example.com' });
  if (p.isCancel(email)) process.exit(0);

  const password = await p.password({ message: 'Password:' });
  if (p.isCancel(password)) process.exit(0);

  const s = p.spinner();
  s.start('Authenticating...');
  await setTimeout(1500);
  s.stop('Authenticated successfully!');
  p.outro(`Welcome back, ${chalk.green(email as string)}!`);
}
