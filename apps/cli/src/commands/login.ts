import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest , cliState } from '../api/api.js';

interface LoginResponse {
  access_token: string;
}


export async function loginAction() {
  const email = await p.text({ message: 'Email address:', placeholder: 'admin@example.com' });
  if (p.isCancel(email)) process.exit(0);

  const password = await p.password({ message: 'Password:' });
  if (p.isCancel(password)) process.exit(0);

  const s = p.spinner();
  s.start('Authenticating...');

  try {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password }
    });

    if (!response.access_token || response.access_token.length < 10) {
      throw new Error('Invalid or missing access token received from server.');
    }

    cliState.token = response.access_token;

    s.stop('Authentication successful!');
    p.outro(`Welcome back, ${chalk.green(email as string)}!`);
    await setTimeout(1500); // Pause briefly before returning to the menu
    return;
    
    
  } catch (error: any) {
    s.stop('Authentication failed!');
    p.outro(chalk.red(`Error: ${error.message}`));
    return; 
  }
}