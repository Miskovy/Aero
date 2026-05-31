/**
 * dashboard.ts — Interactive TUI dashboard.
 *
 * Key improvements:
 *   - Global error boundary with terminal restoration
 *   - safeAction() wrapper for all submenu commands (output pausing)
 *   - Icons system (no emojis)
 *   - ConfigManager integration
 *   - readline.emitKeypressEvents called once globally (prevents listener stacking)
 *   - Explicit stdin.resume() before raw mode entry (prevents dead stdin)
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import readline from 'readline';

import { loginAction, githubLoginAction, registerAction } from '../commands/login.js';
import { deployAction } from '../commands/deploy.js';
import { logsAction } from '../commands/logs.js';
import { createAction } from '../commands/create.js';
import { servicesListAction, servicesInspectAction, servicesStartAction, servicesStopAction, servicesRestartAction, servicesDeleteAction } from '../commands/services.js';
import { nodeListAction, nodeAddAction, nodeRemoveAction } from '../commands/nodes.js';
import { projectsListAction, projectsInspectAction, projectsCreateAction, projectsUpdateAction, projectsDeleteAction } from '../commands/projects.js';
import { envListAction, envSetAction } from '../commands/env.js';
import { chatAction } from '../commands/chat.js';
import ConfigManager from '../utils/config.js';
import icons from '../utils/icons.js';
import { safeAction } from '../utils/safe-action.js';
import { renderTuiFrame, hideCursor, showCursor, DashboardLayout, renderFooter } from './render.js';
import { fetchDashboardData, buildDashboardLayout } from './dashboard-data.js';

// ─── Global keypress wiring (MUST only be called once) ──────────────────────
// Calling readline.emitKeypressEvents multiple times stacks duplicate internal
// 'data' listeners on stdin, causing memory leaks and ghost keypress events.

let keypressWired = false;
function ensureKeypressEvents(): void {
  if (!keypressWired) {
    readline.emitKeypressEvents(process.stdin);
    keypressWired = true;
  }
}

// ─── Layout Cache ────────────────────────────────────────────────────────────

let cachedLayout: DashboardLayout | null = null;

async function getDashboardLayout(forceRefresh = false): Promise<DashboardLayout> {
  const isLoggedIn = ConfigManager.isAuthenticated();

  if (!isLoggedIn) {
    return {
      header: 'Welcome to Aero!',
      time: '',
      health: [
        { label: 'Platform', value: chalk.cyan('Ready'), dot: chalk.cyan(icons.dot) },
        { label: 'Auth', value: chalk.red('Required'), dot: chalk.red(icons.dot) },
      ],
      services: [],
      nodes: [],
      activity: [],
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
      header: chalk.yellow(`${icons.warning} Connecting...`),
      time: '',
      health: [
        { label: 'API', value: chalk.yellow('Connecting to Aero...'), dot: chalk.yellow(icons.dot) },
      ],
      services: [],
      nodes: [],
      activity: [],
    };
  }
}

// ─── TUI Select (raw-mode interactive menu) ─────────────────────────────────

interface TuiOption {
  label: string;
  value: string;
}

async function runTuiSelect(
  options: TuiOption[],
  promptTitle = 'What would you like to do?',
  forceRefreshLayout = false,
  initialIndex = 0,
): Promise<string> {
  // CRITICAL: Ensure stdin is flowing before entering raw mode.
  // After safeAction/waitForEnter, stdin may be paused.
  try { process.stdin.resume(); } catch { /* ignore */ }

  const wasRaw = process.stdin.isRaw;

  try {
    process.stdin.setRawMode(true);
  } catch {
    // Fallback: can't enter raw mode (piped stdin, etc.)
  }

  // Wire keypress events once globally (prevents listener stacking)
  ensureKeypressEvents();
  hideCursor();

  let activeIndex = initialIndex;
  let layoutData: DashboardLayout | null = cachedLayout;
  let loading = !layoutData || forceRefreshLayout;
  let firstRender = true;
  let resolved = false;

  return new Promise<string>((resolve) => {
    const handleKeypress = (_str: string, key: any) => {
      if (!key || resolved) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        showCursor();
        process.exit(0);
      }

      if (key.name === 'up') {
        activeIndex = (activeIndex - 1 + options.length) % options.length;
        renderFrame();
      } else if (key.name === 'down') {
        activeIndex = (activeIndex + 1) % options.length;
        renderFrame();
      } else if (key.name === 'return') {
        resolved = true;
        cleanup();
        resolve(options[activeIndex].value);
      } else if (key.name === 'escape' || key.name === 'q') {
        resolved = true;
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
      process.stdout.removeListener('resize', handleResize);
      try {
        if (!wasRaw) process.stdin.setRawMode(false);
      } catch { /* ignore */ }
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
          health: [{ label: 'Status', value: chalk.dim('Fetching stats...'), dot: chalk.yellow(icons.dot) }],
          services: [],
          nodes: [],
          activity: [],
        };
        const frame = renderTuiFrame(fallbackData, options, activeIndex, promptTitle);
        process.stdout.write(frame + '\n');
      } else {
        const frame = renderTuiFrame(layoutData, options, activeIndex, promptTitle);
        process.stdout.write(frame + '\n');
      }
    };

    // Background data fetch
    getDashboardLayout(forceRefreshLayout)
      .then((data) => {
        layoutData = data;
        loading = false;
        if (!resolved) renderFrame();
      })
      .catch(() => {
        loading = false;
        if (!resolved) renderFrame();
      });

    const clockInterval = setInterval(() => {
      if (layoutData && !resolved) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
          .formatToParts(now)
          .find((part) => part.type === 'timeZoneName')?.value || '';
        layoutData.time = `${timeStr} ${tzName}`;
        renderFrame();
      }
    }, 5000);

    process.stdout.on('resize', handleResize);
    process.stdin.on('keypress', handleKeypress);
    renderFrame();
  });
}

// ─── Main Dashboard Loop ────────────────────────────────────────────────────

export async function startInteractiveDashboard() {
  let forceRefresh = true;

  // Enter alternate screen buffer to prevent scrollback pollution
  try { process.stdout.write('\x1B[?1049h'); } catch { /* ignore */ }

  // Global error boundary — always restore terminal
  try {
    while (true) {
      const isLoggedIn = ConfigManager.isAuthenticated();
      const options: TuiOption[] = [];

      if (!isLoggedIn) {
        options.push({ value: 'login', label: `${icons.login} Login to Aero` });
        options.push({ value: 'register', label: `${icons.register} Create an Account` });
        options.push({ value: 'githubLogin', label: `${icons.github} Login with GitHub` });
      } else {
        // Primary actions
        options.push({ value: 'create', label: `${icons.create} Create & Deploy New Service` });
        options.push({ value: 'deploy', label: `${icons.deploy} Deploy Existing Service` });
        options.push({ value: 'logs', label: `${icons.logs} Logs & Deployments` });
        // Management
        options.push({ value: 'services', label: `${icons.service} Manage Services` });
        options.push({ value: 'projects', label: `${icons.project} Manage Projects` });
        options.push({ value: 'nodes', label: `${icons.node} Manage Nodes` });
        options.push({ value: 'envvars', label: `${icons.env} Environment Variables` });
        // Utilities
        options.push({ value: 'settings', label: `${icons.settings} Settings` });
        options.push({ value: 'refresh', label: `${icons.refresh} Refresh Dashboard` });
        // Account
        options.push({ value: 'logout', label: `${icons.logout} Logout` });
      }
      options.push({ value: 'exit', label: `${icons.exit} Exit` });

      const response = await runTuiSelect(options, 'What would you like to do?', forceRefresh);
      forceRefresh = false;

      if (response === 'exit' || response === 'back') {
        console.clear();
        console.log(renderFooter());
        p.outro(chalk.cyan('Goodbye!'));
        process.exit(0);
      }

      switch (response) {
        // Auth
        case 'login':
          await safeAction(() => loginAction(), 'Login');
          forceRefresh = true;
          break;
        case 'register':
          await safeAction(() => registerAction(), 'Register');
          forceRefresh = true;
          break;
        case 'githubLogin':
          await safeAction(() => githubLoginAction(), 'GitHub Login');
          forceRefresh = true;
          break;

        // Primary actions
        case 'create':
          await safeAction(() => createAction(), 'Create Service');
          forceRefresh = true;
          break;
        case 'deploy':
          await safeAction(() => deployAction(), 'Deploy');
          forceRefresh = true;
          break;
        case 'logs':
          await safeAction(() => logsAction(), 'Logs');
          break;
        case 'chat':
          await safeAction(() => chatAction(), 'Chat');
          break;

        // Management submenus
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

        // Settings submenu
        case 'settings':
          await settingsSubmenu();
          break;

        // Refresh
        case 'refresh':
          forceRefresh = true;
          break;

        // Account
        case 'logout':
          ConfigManager.clearToken();
          cachedLayout = null;
          forceRefresh = true;
          break;
      }
    }
  } catch (err: any) {
    // Global error boundary — restore terminal
    showCursor();
    try { process.stdin.setRawMode(false); } catch { /* ignore */ }
    console.clear();
    console.error(chalk.red(`\nFatal dashboard error: ${err.message}`));
    console.error(chalk.dim(err.stack || ''));
    process.exit(1);
  }
}

// ─── Submenus ────────────────────────────────────────────────────────────────

async function servicesSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: `${icons.service} List All Services` },
        { value: 'inspect', label: `${icons.inspect} Inspect Service` },
        { value: 'start', label: `${icons.start} Start Service` },
        { value: 'stop', label: `${icons.stop} Stop Service` },
        { value: 'restart', label: `${icons.restart} Restart Service` },
        { value: 'delete', label: `${icons.delete} Delete Service` },
        { value: 'back', label: `${icons.back} Back to Menu` },
      ],
      'Services Management',
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await safeAction(() => servicesListAction(), 'List Services'); break;
      case 'inspect': await safeAction(() => servicesInspectAction(), 'Inspect Service'); break;
      case 'start': await safeAction(() => servicesStartAction(), 'Start Service'); break;
      case 'stop': await safeAction(() => servicesStopAction(), 'Stop Service'); break;
      case 'restart': await safeAction(() => servicesRestartAction(), 'Restart Service'); break;
      case 'delete': await safeAction(() => servicesDeleteAction(), 'Delete Service'); break;
    }
  }
}

async function nodesSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: `${icons.node} List All Nodes` },
        { value: 'add', label: `${icons.create} Add Node` },
        { value: 'remove', label: `${icons.delete} Remove Node` },
        { value: 'back', label: `${icons.back} Back to Menu` },
      ],
      'Node Management',
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await safeAction(() => nodeListAction(), 'List Nodes'); break;
      case 'add': await safeAction(() => nodeAddAction(), 'Add Node'); break;
      case 'remove': await safeAction(() => nodeRemoveAction(), 'Remove Node'); break;
    }
  }
}

async function envVarsSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: `${icons.env} List Variables` },
        { value: 'set', label: `${icons.edit} Set Variable` },
        { value: 'back', label: `${icons.back} Back to Menu` },
      ],
      'Environment Variables',
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await safeAction(() => envListAction(), 'List Env Vars'); break;
      case 'set': await safeAction(() => envSetAction(), 'Set Env Var'); break;
    }
  }
}

async function projectsSubmenu() {
  while (true) {
    const action = await runTuiSelect(
      [
        { value: 'list', label: `${icons.project} List All Projects` },
        { value: 'inspect', label: `${icons.inspect} Inspect Project` },
        { value: 'create', label: `${icons.create} Create Project` },
        { value: 'update', label: `${icons.edit} Rename / Update Project` },
        { value: 'delete', label: `${icons.delete} Delete Project` },
        { value: 'back', label: `${icons.back} Back to Menu` },
      ],
      'Projects Management',
    );

    if (action === 'back') return;

    switch (action) {
      case 'list': await safeAction(() => projectsListAction(), 'List Projects'); break;
      case 'inspect': await safeAction(() => projectsInspectAction(), 'Inspect Project'); break;
      case 'create': await safeAction(() => projectsCreateAction(), 'Create Project'); break;
      case 'update': await safeAction(() => projectsUpdateAction(), 'Update Project'); break;
      case 'delete': await safeAction(() => projectsDeleteAction(), 'Delete Project'); break;
    }
  }
}

async function settingsSubmenu() {
  while (true) {
    const config = ConfigManager.getAll();

    const action = await runTuiSelect(
      [
        { value: 'show', label: `${icons.inspect} View Current Configuration` },
        { value: 'theme', label: `${icons.settings} Change Theme (current: ${config.theme})` },
        { value: 'reset', label: `${icons.warning} Reset to Defaults` },
        { value: 'back', label: `${icons.back} Back to Menu` },
      ],
      'Settings',
    );

    if (action === 'back') return;

    switch (action) {
      case 'show':
        await safeAction(async () => {
          const cfg = ConfigManager.getAll();
          console.log('');
          console.log(chalk.bold(`  ${icons.settings} Configuration`));
          console.log(chalk.dim(`  Config file: ${ConfigManager.getConfigPath()}`));
          console.log('');
          console.log(`  ${chalk.dim('Token:')}    ${cfg.token ? chalk.green('Set') : chalk.dim('Not set')}`);
          console.log(`  ${chalk.dim('Theme:')}    ${cfg.theme}`);
          console.log('');
        }, 'View Config');
        break;

      case 'theme':
        await safeAction(async () => {
          const theme = await p.select({
            message: 'Select icon theme:',
            options: [
              { value: 'modern', label: 'Modern — Geometric Unicode glyphs (recommended)' },
              { value: 'ascii', label: 'ASCII — 7-bit safe for legacy terminals' },
            ],
          });
          if (p.isCancel(theme)) return;
          ConfigManager.set('theme', theme as 'modern' | 'ascii');
          p.log.success(chalk.green(`Theme set to ${theme}`));
        }, 'Change Theme');
        break;

      case 'reset':
        await safeAction(async () => {
          const confirm = await p.confirm({
            message: chalk.red('Reset all configuration to defaults?'),
            initialValue: false,
          });
          if (p.isCancel(confirm) || !confirm) return;
          ConfigManager.reset();
          p.log.success(chalk.green('Configuration reset to defaults.'));
        }, 'Reset Config');
        break;
    }
  }
}
