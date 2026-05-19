import * as p from '@clack/prompts';
import chalk from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';

import { loginAction, githubLoginAction, registerAction } from '../commands/login.js';
import { deployAction } from '../commands/deploy.js';
import { logsAction } from '../commands/logs.js';
import { createAction } from '../commands/create.js';
import { servicesListAction, servicesInspectAction, servicesStartAction, servicesStopAction, servicesRestartAction, servicesDeleteAction } from '../commands/services.js';
import { nodeListAction, nodeAddAction, nodeRemoveAction } from '../commands/nodes.js';
import { envListAction, envSetAction } from '../commands/env.js';
import { cliState, saveStoredToken } from '../api/api.js';
import { renderDashboard, renderFooter } from './render.js';
import { fetchDashboardData, buildDashboardLayout } from './dashboard-data.js';

const unicode = isUnicodeSupported();

async function renderRichDashboard() {
  console.clear();

  // Show loading indicator
  const loading = p.spinner();
  loading.start(chalk.dim('Loading dashboard...'));

  try {
    const data = await fetchDashboardData();
    const layout = buildDashboardLayout(data);
    loading.stop('');

    // Clear the spinner output and render the dashboard
    console.clear();
    console.log(renderDashboard(layout));
  } catch {
    loading.stop('');
    console.clear();

    // Fallback minimal header if API is unreachable
    console.log('');
    console.log(chalk.cyan.bold('  ◆ AERO') + chalk.dim('  Self-Hosted Cloud Platform v1.0.0'));
    console.log(chalk.dim('  Could not connect to Aero API'));
    console.log('');
  }
}

function renderLoggedOutHeader() {
  console.clear();
  console.log('');
  console.log(chalk.cyan.bold('  ◆ AERO') + chalk.dim('  Self-Hosted Cloud Platform v1.0.0'));
  console.log('');
  console.log(chalk.dim('  Please log in to access the platform.'));
  console.log('');
}

export async function startInteractiveDashboard() {
  // Render the dashboard once on startup
  let needsDashboardRefresh = true;

  while (true) {
    const isLoggedIn = !!cliState.token;

    // Only re-render dashboard when explicitly needed (startup, logout, or returning from create/deploy)
    if (needsDashboardRefresh) {
      if (isLoggedIn) {
        await renderRichDashboard();
      } else {
        renderLoggedOutHeader();
      }
    }
    needsDashboardRefresh = false;

    const options = [];

    if (!isLoggedIn) {
      options.push({ value: 'login', label: unicode ? '🔑 Login to Aero' : '> Login to Aero' });
      options.push({ value: 'register', label: unicode ? '📝 Create an Account' : '> Create an Account' });
      options.push({ value: 'githubLogin', label: unicode ? '🐙 Login with GitHub' : '> Login with GitHub' });
    } else {
      // Primary actions
      options.push({ value: 'create', label: unicode ? '➕ Create & Deploy New Service' : '> Create & Deploy' });
      options.push({ value: 'deploy', label: unicode ? '🚀 Deploy Existing Service' : '> Deploy Existing' });
      options.push({ value: 'logs', label: unicode ? '📄 Logs & Deployments' : '> Logs & Deployments' });
      // Management
      options.push({ value: 'services', label: unicode ? '📋 Manage Services' : '> Manage Services' });
      options.push({ value: 'nodes', label: unicode ? '🖥️  Manage Nodes' : '> Manage Nodes' });
      options.push({ value: 'envvars', label: unicode ? '🔐 Environment Variables' : '> Environment Variables' });
      // Dashboard refresh
      options.push({ value: 'refresh', label: unicode ? '🔄 Refresh Dashboard' : '> Refresh Dashboard' });
      // Account
      options.push({ value: 'logout', label: unicode ? '🚪 Logout' : '> Logout' });
    }
    options.push({ value: 'exit', label: unicode ? '❌ Exit' : '> Exit' });

    const response = await p.select({
      message: 'What would you like to do?',
      options,
    });

    if (p.isCancel(response) || response === 'exit') {
      console.log(renderFooter());
      p.outro(chalk.cyan('Goodbye!'));
      process.exit(0);
    }

    switch (response) {
      // Auth
      case 'login':
        await loginAction();
        needsDashboardRefresh = true; // Refresh after login
        break;
      case 'register':
        await registerAction();
        needsDashboardRefresh = true;
        break;
      case 'githubLogin':
        await githubLoginAction();
        needsDashboardRefresh = true;
        break;

      // Primary actions
      case 'create':
        await createAction();
        needsDashboardRefresh = true; // Refresh to show new service
        break;
      case 'deploy':
        await deployAction();
        needsDashboardRefresh = true;
        break;
      case 'logs':
        await logsAction();
        // Don't refresh — user wants to stay in context
        break;

      // Management submenus — these loop internally
      case 'services':
        await servicesSubmenu();
        break;
      case 'nodes':
        await nodesSubmenu();
        break;
      case 'envvars':
        await envVarsSubmenu();
        break;

      // Refresh
      case 'refresh':
        needsDashboardRefresh = true;
        break;

      // Account
      case 'logout':
        saveStoredToken(null);
        p.log.success(chalk.green('Successfully logged out.'));
        needsDashboardRefresh = true;
        break;
    }
  }
}

// ─── Submenus (loop until user presses Back) ───────────────────────────────

async function servicesSubmenu() {
  while (true) {
    const action = await p.select({
      message: 'Services Management',
      options: [
        { value: 'list', label: unicode ? '📋 List All Services' : '> List All' },
        { value: 'inspect', label: unicode ? '🔍 Inspect Service' : '> Inspect' },
        { value: 'start', label: unicode ? '▶️  Start Service' : '> Start' },
        { value: 'stop', label: unicode ? '⏹️  Stop Service' : '> Stop' },
        { value: 'restart', label: unicode ? '🔄 Restart Service' : '> Restart' },
        { value: 'delete', label: unicode ? '🗑️  Delete Service' : '> Delete' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
    });

    if (p.isCancel(action) || action === 'back') return;

    switch (action) {
      case 'list': await servicesListAction(); break;
      case 'inspect': await servicesInspectAction(); break;
      case 'start': await servicesStartAction(); break;
      case 'stop': await servicesStopAction(); break;
      case 'restart': await servicesRestartAction(); break;
      case 'delete': await servicesDeleteAction(); break;
    }
  }
}

async function nodesSubmenu() {
  while (true) {
    const action = await p.select({
      message: 'Node Management',
      options: [
        { value: 'list', label: unicode ? '📋 List All Nodes' : '> List All' },
        { value: 'add', label: unicode ? '➕ Add Node' : '> Add Node' },
        { value: 'remove', label: unicode ? '🗑️  Remove Node' : '> Remove Node' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
    });

    if (p.isCancel(action) || action === 'back') return;

    switch (action) {
      case 'list': await nodeListAction(); break;
      case 'add': await nodeAddAction(); break;
      case 'remove': await nodeRemoveAction(); break;
    }
  }
}

async function envVarsSubmenu() {
  while (true) {
    const action = await p.select({
      message: 'Environment Variables',
      options: [
        { value: 'list', label: unicode ? '📋 List Variables' : '> List' },
        { value: 'set', label: unicode ? '✏️  Set Variable' : '> Set' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
    });

    if (p.isCancel(action) || action === 'back') return;

    switch (action) {
      case 'list': await envListAction(); break;
      case 'set': await envSetAction(); break;
    }
  }
}
