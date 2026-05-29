import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest, cliState } from '../api/api.js';
import axios from 'axios';
import { saveStoredToken, exchangeGithubTokenWithAero } from '../api/api.js';


const GITHUB_CLIENT_ID = 'Ov23lir8cKuGCkvvY1bE';
const AERO_API_URL = 'https://aero-y6mm.onrender.com';

interface LoginResponse {
  access_token: string;
}

export async function registerAction() {
  p.intro(chalk.bgBlue.cyan(' Create Aero Account '));
  const name = await p.text({ message: 'Full Name:', placeholder: 'John Doe' });
  if (p.isCancel(name)) process.exit(0);

  const email = await p.text({ message: 'Email address:', placeholder: 'admin@example.com' });
  if (p.isCancel(email)) process.exit(0);

  const password = await p.password({ message: 'Password (min 6 characters):' });
  if (p.isCancel(password)) process.exit(0);

  const s = p.spinner();
  s.start('Creating account...');

  try {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/auth/register',
      data: { name, email, password, auth_provider: 'CLI' }
    });

    if (!response.access_token || response.access_token.length < 10) {
      throw new Error('Invalid or missing access token received from server.'); 
    }

    cliState.token = response.access_token;
    saveStoredToken(response.access_token);

    s.stop('Account created successfully!');
    p.outro(`Welcome to Aero, ${chalk.green(name as string)}! You are now logged in.`);
    await setTimeout(1500);
    return;
  } catch (error: any) {
    s.stop('Registration failed!');
    p.outro(chalk.red(`Error: ${error.message}`));
    await setTimeout(1500);
    return;
  }
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

export async function githubLoginAction() {
  const s = p.spinner();

  try {
    s.start('Requesting device authorization from GitHub');

    const deviceInitRes = await axios.post('https://github.com/login/device/code', {
      client_id: GITHUB_CLIENT_ID,
      scope: 'user:email',
    }, {
      headers: { 'Accept': 'application/json' }
    });

    const deviceData = deviceInitRes.data;

    if (!deviceData.device_code) {
      s.stop('Failed to initiate login.');
      p.log.error(deviceData.error_description || 'Unknown error');
      return;
    }

    s.stop('Authorization requested.');

    p.note(
      `1. Open this URL: ${chalk.cyan.underline(deviceData.verification_uri)}\n2. Enter code: ${chalk.bold.yellow(deviceData.user_code)}`,
      'GitHub Authentication'
    );

    s.start('Waiting for browser authentication...');

    let githubAccessToken = null;
    let isPolling = true;

    while (isPolling) {

      await setTimeout(deviceData.interval * 1000);

      const pollRes = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceData.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }, 
      {
        headers: { 'Accept': 'application/json' },
        validateStatus: () => true // Prevent axios from throwing on 400 errors during polling
      });

      const pollData = pollRes.data;

      if (pollData.access_token) {
        githubAccessToken = pollData.access_token;
        isPolling = false;
      } else if (pollData.error !== 'authorization_pending') {
        isPolling = false;
        throw new Error(pollData.error_description || pollData.error);
      }
    }

    s.message('GitHub authenticated. Exchanging for Aero credentials...');

    const { access_token } = await exchangeGithubTokenWithAero(githubAccessToken);

    saveStoredToken(access_token);

    s.stop('Login complete!');
    p.log.success('Successfully logged into Aero CLI.');
    return;
  } catch (error: any) {
    s.stop('Login failed.');
    p.log.error(error.message || 'An unknown error occurred.');
  }
}

export async function logoutAction() {
  saveStoredToken(null);
  p.outro(chalk.green('Successfully logged out.'));
}
