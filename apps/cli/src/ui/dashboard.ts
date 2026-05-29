import * as p from '@clack/prompts';
import chalk from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';
import readline from 'readline';

import { loginAction, githubLoginAction, registerAction } from '../commands/login.js';
import { deployAction } from '../commands/deploy.js';
import { logsAction } from '../commands/logs.js';
import { createAction } from '../commands/create.js';
import { servicesListAction, servicesInspectAction, servicesStartAction, servicesStopAction, servicesRestartAction, servicesDeleteAction } from '../commands/services.js';
import { nodeListAction, nodeAddAction, nodeRemoveAction } from '../commands/nodes.js';
import { projectsListAction, projectsInspectAction, projectsCreateAction, projectsUpdateAction, projectsDeleteAction } from '../commands/projects.js';
import { envListAction, envSetAction } from '../commands/env.js';
import { cliState, saveStoredToken } from '../api/api.js';
import { renderTuiFrame, hideCursor, showCursor, DashboardLayout, renderFooter } from './render.js';
import { fetchDashboardData, buildDashboardLayout } from './dashboard-data.js';

const unicode = isUnicodeSupported();

// Cache layout data to keep submenu transitions instantaneous
let cachedLayout: DashboardLayout | null = null;

async function getDashboardLayout(forceRefresh = false): Promise<DashboardLayout> {
  const isLoggedIn = !!cliState.token;
  if (!isLoggedIn) {
    return {
      header: 'Welcome to Aero!',
      time: '',
      health: [
        { label: 'Platform', value: chalk.cyan('Ready'), dot: chalk.cyan('●') },
        { label: 'Authentication', value: chalk.red('Required'), dot: chalk.red('●') }
      ],
      services: [],
      nodes: [],
      activity: []
    };
  }

  if (cachedLayout && !forceRefresh) {
    return cachedLayout;
  }

  try {
    const data = await fetchDashboardData();
    cachedLayout = buildDashboardLayout(data);
    return cachedLayout;
  } catch {
    return {
      header: chalk.red('▲ Connection Offline'),
      time: '',
      health: [
        { label: 'Status', value: chalk.red('Aero API Unreachable'), dot: chalk.red('●') }
      ],
      services: [],
      nodes: [],
      activity: []
    };
  }
}

interface TuiOption {
  label: string;
  value: string;
}

async function runTuiSelect(
  options: TuiOption[],
  promptTitle = 'What would you like to do?',
  forceRefreshLayout = false,
  initialIndex = 0
): Promise<string> {
  const isRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);
  hideCursor();

  let activeIndex = initialIndex;
  let layoutData: DashboardLayout | null = cachedLayout;
  let loading = !layoutData || forceRefreshLayout;
  let firstRender = true;

  return new Promise<string>((resolve) => {
    const handleKeypress = (str: string, key: any) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'up') {
        activeIndex = (activeIndex - 1 + options.length) % options.length;
        renderFrame();
      } else if (key.name === 'down') {
        activeIndex = (activeIndex + 1) % options.length;
        renderFrame();
      } else if (key.name === 'return') {
        cleanup();
        resolve(options[activeIndex].value);
      } else if (key.name === 'escape' || key.name === 'q') {
        cleanup();
        resolve('back');
      }
    };

    const handleResize = () => {
      firstRender = true;
      renderFrame();
    };

    const cleanup = () => {
      clearInterval(clockInterval);
      process.stdin.removeListener('keypress', handleKeypress);
      process.stdout.off('resize', handleResize);
      if (!isRaw) process.stdin.setRawMode(false);
      showCursor();
    };

    const renderFrame = () => {
      if (firstRender) {
        console.clear();
        firstRender = false;
      } else {
        process.stdout.write('\x1B[H');
      }

      if (loading || !layoutData) {
        const fallbackData: DashboardLayout = {
          header: 'Loading Aero Dashboard...',
          time: '',
          health: [{ label: 'Status', value: chalk.dim('Fetching stats...'), dot: chalk.yellow('●') }],
          services: [],
          nodes: [],
          activity: []
        };
        const frame = renderTuiFrame(fallbackData, options, activeIndex, promptTitle);
        process.stdout.write(frame + '\n');
      } else {
        const frame = renderTuiFrame(layoutData, options, activeIndex, promptTitle);
        process.stdout.write(frame + '\n');
      }
    };

    // Background fetch in the correct scope
    getDashboardLayout(forceRefreshLayout).then((data) => {
      layoutData = data;
      loading = false;
      renderFrame();
    }).catch(() => {
      loading = false;
      renderFrame();
    });

    const clockInterval = setInterval(() => {
      if (layoutData) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
          .formatToParts(now)
          .find(part => part.type === 'timeZoneName')?.value || '';
        layoutData.time = `${timeStr} ${tzName}`;
        renderFrame();
      }
    }, 5000);

    process.stdout.on('resize', handleResize);
    process.stdin.on('keypress', handleKeypress);
    renderFrame();
  });
}

export async function startInteractiveDashboard() {
  let forceRefresh = true; // Refresh from API on startup

  while (true) {
    const isLoggedIn = !!cliState.token;
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
      options.push({ value: 'projects', label: unicode ? '📁 Manage Projects' : '> Manage Projects' });
      options.push({ value: 'nodes', label: unicode ? '🖥️  Manage Nodes' : '> Manage Nodes' });
      options.push({ value: 'envvars', label: unicode ? '🔐 Environment Variables' : '> Environment Variables' });
      // Dashboard refresh
      options.push({ value: 'refresh', label: unicode ? '🔄 Refresh Dashboard' : '> Refresh Dashboard' });
      // Account
      options.push({ value: 'logout', label: unicode ? '🚪 Logout' : '> Logout' });
    }
    options.push({ value: 'exit', label: unicode ? '❌ Exit' : '> Exit' });

    const response = await runTuiSelect(options, 'What would you like to do?', forceRefresh);
    forceRefresh = false; // Reset refresh flag

    if (response === 'exit' || response === 'back') {
      console.clear();
      console.log(renderFooter());
      p.outro(chalk.cyan('Goodbye!'));
      process.exit(0);
    }

    switch (response) {
      // Auth
      case 'login':
        await loginAction();
        forceRefresh = true;
        break;
      case 'register':
        await registerAction();
        forceRefresh = true;
        break;
      case 'githubLogin':
        await githubLoginAction();
        forceRefresh = true;
        break;

      // Primary actions
      case 'create':
        await createAction();
        forceRefresh = true;
        break;
      case 'deploy':
        await deployAction();
        forceRefresh = true;
        break;
      case 'logs':
        await logsAction();
        break;

      // Management submenus — these loop internally
      case 'services':
        await servicesSubmenu();
        break;
      case 'projects':
        await projectsSubmenu();
        break;
      case 'nodes':
        await nodesSubmenu();
        break;
      case 'envvars':
        await envVarsSubmenu();
        break;

      // Refresh
      case 'refresh':
        forceRefresh = true;
        break;

      // Account
      case 'logout':
        saveStoredToken(null);
        cachedLayout = null;
        console.clear();
        p.log.success(chalk.green('Successfully logged out.'));
        forceRefresh = true;
        break;
    }
  }
}

// ─── Submenus (loop until user presses Back) ───────────────────────────────

async function servicesSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: unicode ? '📋 List All Services' : '> List All' },
        { value: 'inspect', label: unicode ? '🔍 Inspect Service' : '> Inspect' },
        { value: 'start', label: unicode ? '▶️  Start Service' : '> Start' },
        { value: 'stop', label: unicode ? '⏹️  Stop Service' : '> Stop' },
        { value: 'restart', label: unicode ? '🔄 Restart Service' : '> Restart' },
        { value: 'delete', label: unicode ? '🗑️  Delete Service' : '> Delete' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
      'Services Management'
    );

    if (action === 'back') return;

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
    const action = await runTuiSelect(
      [
        { value: 'list', label: unicode ? '📋 List All Nodes' : '> List All' },
        { value: 'add', label: unicode ? '➕ Add Node' : '> Add Node' },
        { value: 'remove', label: unicode ? '🗑️  Remove Node' : '> Remove Node' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
      'Node Management'
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await nodeListAction(); break;
      case 'add': await nodeAddAction(); break;
      case 'remove': await nodeRemoveAction(); break;
    }
  }
}

async function envVarsSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: unicode ? '📋 List Variables' : '> List' },
        { value: 'set', label: unicode ? '✏️  Set Variable' : '> Set' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
      'Environment Variables'
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await envListAction(); break;
      case 'set': await envSetAction(); break;
    }
  }
}

async function projectsSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: unicode ? '📋 List All Projects' : '> List All' },
        { value: 'inspect', label: unicode ? '🔍 Inspect Project' : '> Inspect' },
        { value: 'create', label: unicode ? '➕ Create Project' : '> Create' },
        { value: 'update', label: unicode ? '✏️  Rename / Update Project' : '> Rename / Update' },
        { value: 'delete', label: unicode ? '🗑️  Delete Project' : '> Delete' },
        { value: 'back', label: unicode ? '⬅️  Back to Menu' : '> Back' },
      ],
      'Projects Management'
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await projectsListAction(); break;
      case 'inspect': await projectsInspectAction(); break;
      case 'create': await projectsCreateAction(); break;
      case 'update': await projectsUpdateAction(); break;
      case 'delete': await projectsDeleteAction(); break;
    }
  }
}
