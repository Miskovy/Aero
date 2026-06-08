/**
 * login.ts — Authentication commands (login, register, GitHub OAuth, logout).
 *
 * All auth flows persist the token via ConfigManager.
 * Cancel actions return gracefully instead of process.exit().
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import axios from 'axios';
import { setTimeout } from 'node:timers/promises';
import { apiRequest, exchangeGithubTokenWithAero } from '../api/api.js';
import ConfigManager from '../utils/config.js';
import icons from '../utils/icons.js';

const GITHUB_CLIENT_ID = 'Ov23lir8cKuGCkvvY1bE';

interface LoginResponse {
  access_token: string;
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerAction() {
  p.intro(chalk.bgBlue.cyan(' Create Aero Account '));

  const name = await p.text({ message: 'Full Name:', placeholder: 'John Doe' });
  if (p.isCancel(name)) return;

  const email = await p.text({ message: 'Email address:', placeholder: 'admin@example.com' });
  if (p.isCancel(email)) return;

  const password = await p.password({ message: 'Password (min 6 characters):' });
  if (p.isCancel(password)) return;

  const s = p.spinner();
  s.start('Creating account...');

  try {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/auth/register',
      data: { name, email, password, auth_provider: 'CLI' },
    });

    if (!response.access_token || response.access_token.length < 10) {
      throw new Error('Invalid or missing access token received from server.');
    }

    ConfigManager.set('token', response.access_token);

    s.stop(`${icons.success} Account created successfully!`);
    p.outro(`Welcome to Aero, ${chalk.green(name as string)}! You are now logged in.`);
    await setTimeout(1500);
  } catch (error: any) {
    s.stop(`${icons.error} Registration failed!`);
    p.outro(chalk.red(`Error: ${error.message}`));
    await setTimeout(1500);
  }
}

// ─── Login (Email/Password) ──────────────────────────────────────────────────

export async function loginAction() {
  const email = await p.text({ message: 'Email address:', placeholder: 'admin@example.com' });
  if (p.isCancel(email)) return;

  const password = await p.password({ message: 'Password:' });
  if (p.isCancel(password)) return;

  const s = p.spinner();
  s.start('Authenticating...');

  try {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });

    if (!response.access_token || response.access_token.length < 10) {
      throw new Error('Invalid or missing access token received from server.');
    }

    // Persist token to disk (this was the bug — previously only set in memory)
    ConfigManager.set('token', response.access_token);

    s.stop(`${icons.success} Authentication successful!`);
    p.outro(`Welcome back, ${chalk.green(email as string)}!`);
    await setTimeout(1500);
  } catch (error: any) {
    s.stop(`${icons.error} Authentication failed!`);
    p.outro(chalk.red(`Error: ${error.message}`));
    await setTimeout(1500);
  }
}

// ─── GitHub OAuth (Device Flow) ──────────────────────────────────────────────

export async function githubLoginAction() {
  const s = p.spinner();

  try {
    s.start('Requesting device authorization from GitHub');

    const deviceInitRes = await axios.post(
      'https://github.com/login/device/code',
      { client_id: GITHUB_CLIENT_ID, scope: 'user:email' },
      { headers: { Accept: 'application/json' } },
    );

    const deviceData = deviceInitRes.data;

    if (!deviceData.device_code) {
      s.stop(`${icons.error} Failed to initiate login.`);
      p.log.error(deviceData.error_description || 'Unknown error');
      return;
    }

    s.stop(`${icons.success} Authorization requested.`);

    p.note(
      `1. Open this URL: ${chalk.cyan.underline(deviceData.verification_uri)}\n2. Enter code: ${chalk.bold.yellow(deviceData.user_code)}`,
      'GitHub Authentication',
    );

    s.start('Waiting for browser authentication...');

    let githubAccessToken: string | null = null;
    let isPolling = true;

    while (isPolling) {
      await setTimeout(deviceData.interval * 1000);

      const pollRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceData.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        },
        {
          headers: { Accept: 'application/json' },
          validateStatus: () => true,
        },
      );

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

    const { access_token } = await exchangeGithubTokenWithAero(githubAccessToken!);
    ConfigManager.set('token', access_token);

    s.stop(`${icons.success} Login complete!`);
    p.log.success('Successfully logged into Aero CLI.');
  } catch (error: any) {
    s.stop(`${icons.error} Login failed.`);
    p.log.error(error.message || 'An unknown error occurred.');
  }
}

export async function logoutAction() {
  const refreshToken = ConfigManager.get('refreshToken');
  const token = ConfigManager.get('token');

  if (refreshToken || token) {
    const s = p.spinner();
    s.start('Revoking session on servers...');
    try {
      await apiRequest({
        method: 'POST',
        url: '/auth/logout',
        headers: refreshToken ? {
          Cookie: `aero_rt=${refreshToken}`
        } : undefined
      });
      s.stop(`${icons.success} Server session revoked.`);
    } catch {
      s.stop(`${icons.success} Local session cleared.`);
    }
  }

  ConfigManager.clearToken();
  p.outro(chalk.green(`${icons.success} Successfully logged out.`));
}
