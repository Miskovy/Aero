/**
 * render.ts — TUI rendering engine.
 *
 * Provides box-drawn dashboard panels with:
 *   - Responsive stacking: side-by-side columns at >= 88 width, vertical stacking below
 *   - Minimum width guard (60 columns)
 *   - Terminal height clamping to avoid scroll overflow
 *   - Icons system integration (no hardcoded emojis)
 *   - Scroll-windowed menu rendering (active item always visible)
 *   - formatBytes() helper for human-readable sizes
 */

import chalk from 'chalk';
import getCliVersion from '../utils/version.js';
import icons from '../utils/icons.js';

// ─── Box Drawing Characters ─────────────────────────────────────────────────

const BOX = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║',
  tMid: '╦', bMid: '╩',
  lMid: '╠', rMid: '╣', cross: '╬',
  hThin: '─', vThin: '│',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function pad(str: string, width: number): string {
  const visible = stripAnsi(str);
  const diff = width - visible.length;
  if (diff <= 0) return str;
  return str + ' '.repeat(diff);
}

export function center(str: string, width: number): string {
  const visible = stripAnsi(str);
  const diff = width - visible.length;
  if (diff <= 0) return str;
  const left = Math.floor(diff / 2);
  const right = diff - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

export function truncate(str: string, maxLen: number): string {
  if (maxLen < 1) return '';
  const visible = stripAnsi(str);
  if (visible.length <= maxLen) return str;
  return visible.substring(0, maxLen - 1) + '…';
}

// ─── Byte Formatting ────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ─── Status Indicators ──────────────────────────────────────────────────────

export function statusDot(status: string): string {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'connected':
    case 'running':
    case 'online':
    case 'completed':
      return chalk.green(icons.dot);
    case 'degraded':
    case 'deploying':
    case 'building':
    case 'queued':
      return chalk.yellow(icons.dot);
    case 'disconnected':
    case 'failed':
    case 'offline':
    case 'stopped':
      return chalk.red(icons.dot);
    default:
      return chalk.gray(icons.dot);
  }
}

export function statusColor(status: string): (str: string) => string {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'connected':
    case 'running':
    case 'online':
    case 'completed':
      return chalk.green;
    case 'degraded':
    case 'deploying':
    case 'building':
    case 'queued':
      return chalk.yellow;
    case 'disconnected':
    case 'failed':
    case 'offline':
    case 'stopped':
      return chalk.red;
    default:
      return chalk.gray;
  }
}

// ─── Time Formatting ────────────────────────────────────────────────────────

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Panel Rendering ────────────────────────────────────────────────────────

export interface DashboardLayout {
  header: string;
  time: string;
  health: { label: string; value: string; dot: string }[];
  services: { label: string; value: string }[];
  nodes: { name: string; status: string }[];
  activity: { message: string; time: string }[];
}

// ─── Responsive Dashboard ───────────────────────────────────────────────────

const MIN_WIDTH = 60;
const STACK_BREAKPOINT = 88;

/**
 * Render a single full-width panel section (used in stacked mode).
 */
function renderStackedPanel(
  title: string,
  rows: string[],
  innerWidth: number,
): string[] {
  const lines: string[] = [];
  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(innerWidth)}${BOX.rMid}`));
  lines.push(`${chalk.cyan(BOX.v)} ${chalk.bold.white(pad(title, innerWidth - 2))} ${chalk.cyan(BOX.v)}`);
  lines.push(`${chalk.cyan(BOX.v)} ${chalk.dim(BOX.hThin.repeat(innerWidth - 2))} ${chalk.cyan(BOX.v)}`);
  for (const row of rows) {
    lines.push(`${chalk.cyan(BOX.v)} ${pad(row, innerWidth - 2)} ${chalk.cyan(BOX.v)}`);
  }
  return lines;
}

/**
 * Render two panels side by side (used in wide mode).
 */
function renderSideBySide(
  leftTitle: string,
  leftRows: string[],
  rightTitle: string,
  rightRows: string[],
  halfLeft: number,
  halfRight: number,
): string[] {
  const lines: string[] = [];

  // Build panel content
  const lContent = [chalk.bold.white(leftTitle), chalk.dim(BOX.hThin.repeat(halfLeft - 4)), ...leftRows];
  const rContent = [chalk.bold.white(rightTitle), chalk.dim(BOX.hThin.repeat(halfRight - 4)), ...rightRows];

  const maxRows = Math.max(lContent.length, rContent.length);
  while (lContent.length < maxRows) lContent.push('');
  while (rContent.length < maxRows) rContent.push('');

  // Divider
  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(halfLeft)}${BOX.tMid}${BOX.h.repeat(halfRight)}${BOX.rMid}`));

  for (let i = 0; i < maxRows; i++) {
    const l = pad(lContent[i], halfLeft - 2);
    const r = pad(rContent[i], halfRight - 2);
    lines.push(`${chalk.cyan(BOX.v)} ${l} ${chalk.cyan(BOX.vThin)} ${r} ${chalk.cyan(BOX.v)}`);
  }

  return lines;
}

export function renderDashboard(data: DashboardLayout, termWidth?: number): string {
  const rawWidth = termWidth || process.stdout.columns || 90;
  const width = Math.max(MIN_WIDTH, Math.min(rawWidth, 120));
  const innerWidth = width - 2;
  const isWide = width >= STACK_BREAKPOINT;

  const lines: string[] = [];

  // ── Top border + Brand ──
  lines.push(chalk.cyan(`${BOX.tl}${BOX.h.repeat(innerWidth)}${BOX.tr}`));

  const brand = chalk.bold.cyan(`${icons.brand} AERO`);
  const version = chalk.dim(`Self-Hosted Cloud Platform v${getCliVersion()}`);
  const brandGap = Math.max(1, innerWidth - stripAnsi(brand).length - stripAnsi(version).length - 4);
  const brandLine = `  ${brand}${' '.repeat(brandGap)}${version}  `;
  lines.push(chalk.cyan(BOX.v) + pad(brandLine, innerWidth) + chalk.cyan(BOX.v));

  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(innerWidth)}${BOX.rMid}`));

  // ── Welcome line ──
  const welcome = `  ${data.header}`;
  const timePart = `${chalk.dim(icons.clock)} ${chalk.dim(data.time)}  `;
  const welcomeGap = Math.max(1, innerWidth - stripAnsi(welcome).length - stripAnsi(timePart).length);
  const welcomeLine = welcome + ' '.repeat(welcomeGap) + timePart;
  lines.push(chalk.cyan(BOX.v) + pad(welcomeLine, innerWidth) + chalk.cyan(BOX.v));

  // ── Build panel data ──
  // Calculate max value width for health rows to prevent column overflow.
  // In wide mode, each panel is roughly halfLeft wide. Account for:
  // dot(2) + space(1) + label(12) + value + padding(2) = halfLeft
  const maxHealthValueWidth = isWide
    ? Math.floor(innerWidth / 2) - 18
    : innerWidth - 18;

  const healthRows: string[] = [];
  for (const item of data.health) {
    const lbl = chalk.gray(item.label.padEnd(12));
    const val = truncate(item.value, maxHealthValueWidth);
    healthRows.push(`${item.dot} ${lbl}${val}`);
  }

  const serviceRows: string[] = [];
  for (const item of data.services) {
    const lbl = chalk.gray(item.label.padEnd(14));
    serviceRows.push(`${lbl}${item.value}`);
  }

  const nodeRows: string[] = [];
  if (data.nodes.length === 0) {
    nodeRows.push(chalk.dim('  No nodes connected'));
  } else {
    for (const n of data.nodes.slice(0, 5)) {
      const dot = statusDot(n.status);
      nodeRows.push(`${dot} ${chalk.white(n.name.padEnd(18))}${statusColor(n.status)(n.status)}`);
    }
  }

  const activityRows: string[] = [];
  if (data.activity.length === 0) {
    activityRows.push(chalk.dim('  No recent activity'));
  } else {
    const maxMsgLen = isWide ? 30 : innerWidth - 18;
    for (const a of data.activity.slice(0, 5)) {
      const msg = truncate(a.message, maxMsgLen);
      activityRows.push(`${chalk.white(pad(msg, maxMsgLen + 2))}${chalk.dim(a.time)}`);
    }
  }

  // ── Render panels ──
  if (isWide) {
    const halfLeft = Math.floor(innerWidth / 2);
    const halfRight = innerWidth - halfLeft - 1;

    lines.push(...renderSideBySide('SYSTEM STATUS', healthRows, 'SERVICES', serviceRows, halfLeft, halfRight));
    lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(halfLeft)}${BOX.cross}${BOX.h.repeat(halfRight)}${BOX.rMid}`));

    // Nodes + Activity
    const maxBottom = Math.max(nodeRows.length + 2, activityRows.length + 2);
    const nContent = [chalk.bold.white('NODES'), chalk.dim(BOX.hThin.repeat(halfLeft - 4)), ...nodeRows];
    const aContent = [chalk.bold.white('RECENT ACTIVITY'), chalk.dim(BOX.hThin.repeat(halfRight - 4)), ...activityRows];
    while (nContent.length < maxBottom) nContent.push('');
    while (aContent.length < maxBottom) aContent.push('');

    for (let i = 0; i < maxBottom; i++) {
      const l = pad(nContent[i], halfLeft - 2);
      const r = pad(aContent[i], halfRight - 2);
      lines.push(`${chalk.cyan(BOX.v)} ${l} ${chalk.cyan(BOX.vThin)} ${r} ${chalk.cyan(BOX.v)}`);
    }

    lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(halfLeft)}${BOX.bMid}${BOX.h.repeat(halfRight)}${BOX.rMid}`));
  } else {
    // Stacked mode for narrow terminals
    lines.push(...renderStackedPanel('SYSTEM STATUS', healthRows, innerWidth));
    lines.push(...renderStackedPanel('SERVICES', serviceRows, innerWidth));
    lines.push(...renderStackedPanel('NODES', nodeRows, innerWidth));
    lines.push(...renderStackedPanel('RECENT ACTIVITY', activityRows, innerWidth));
  }

  // ── Empty padding line ──
  lines.push(chalk.cyan(BOX.v) + ' '.repeat(innerWidth) + chalk.cyan(BOX.v));

  return lines.join('\n');
}

// ─── Footer ─────────────────────────────────────────────────────────────────

export function renderFooter(termWidth?: number): string {
  const rawWidth = termWidth || process.stdout.columns || 90;
  const width = Math.max(MIN_WIDTH, Math.min(rawWidth, 120));
  const innerWidth = width - 2;
  return chalk.cyan(`${BOX.bl}${BOX.h.repeat(innerWidth)}${BOX.br}`);
}

// ─── Cursor Helpers ─────────────────────────────────────────────────────────

export function hideCursor(): void {
  process.stdout.write('\x1B[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1B[?25h');
}

// ─── Minimum Width Guard ────────────────────────────────────────────────────

function renderTooNarrow(): string {
  return [
    chalk.yellow('Terminal too narrow.'),
    chalk.dim('Please resize to at'),
    chalk.dim(`least ${MIN_WIDTH} columns.`),
  ].join('\n');
}

// ─── Complete TUI Frame ─────────────────────────────────────────────────────

export function renderTuiFrame(
  data: DashboardLayout,
  menuOptions: { label: string; value: string }[],
  activeMenuIndex: number,
  promptTitle = 'What would you like to do?',
  termWidth?: number,
): string {
  const rawWidth = termWidth || process.stdout.columns || 90;

  if (rawWidth < MIN_WIDTH) {
    return renderTooNarrow();
  }

  const width = Math.max(MIN_WIDTH, Math.min(rawWidth, 120));
  const innerWidth = width - 2;

  // Clamp menu items to available terminal height
  const termHeight = process.stdout.rows || 40;
  const dashboardBody = renderDashboard(data, termWidth);
  const dashLines = dashboardBody.split('\n').length;
  const availableMenuLines = Math.max(3, termHeight - dashLines - 6);

  // ── Scroll-windowed menu rendering ──
  // Instead of always showing the first N items, compute a window that
  // keeps the active selection visible at all times.
  let scrollOffset = 0;
  if (menuOptions.length > availableMenuLines) {
    // Keep active item roughly in the middle of the visible window
    const halfWindow = Math.floor(availableMenuLines / 2);
    scrollOffset = Math.max(0, activeMenuIndex - halfWindow);
    // Don't scroll past the end
    scrollOffset = Math.min(scrollOffset, menuOptions.length - availableMenuLines);
  }
  const visibleOptions = menuOptions.slice(scrollOffset, scrollOffset + availableMenuLines);

  const lines = [dashboardBody];

  // Prompt
  const promptText = `  ${chalk.cyan(icons.brand)} ${chalk.bold.white(promptTitle)}`;
  lines.push(chalk.cyan(BOX.v) + pad(promptText, innerWidth) + chalk.cyan(BOX.v));
  lines.push(chalk.cyan(BOX.v) + ' '.repeat(innerWidth) + chalk.cyan(BOX.v));

  // Menu options
  for (let i = 0; i < visibleOptions.length; i++) {
    const opt = visibleOptions[i];
    const globalIndex = i + scrollOffset;
    let optionLine = '';
    if (globalIndex === activeMenuIndex) {
      optionLine = `   ${chalk.cyan(icons.pointer)} ${chalk.cyan.bold(opt.label)}`;
    } else {
      optionLine = `     ${chalk.gray(opt.label)}`;
    }
    lines.push(chalk.cyan(BOX.v) + pad(optionLine, innerWidth) + chalk.cyan(BOX.v));
  }

  // Scroll indicators
  if (menuOptions.length > availableMenuLines) {
    const above = scrollOffset;
    const below = menuOptions.length - scrollOffset - availableMenuLines;
    const scrollHints: string[] = [];
    if (above > 0) scrollHints.push(`↑ ${above} more`);
    if (below > 0) scrollHints.push(`↓ ${below} more`);
    const scrollText = chalk.dim(`     ${scrollHints.join('  ')}`);
    lines.push(chalk.cyan(BOX.v) + pad(scrollText, innerWidth) + chalk.cyan(BOX.v));
  }

  // Bottom padding + footer
  lines.push(chalk.cyan(BOX.v) + ' '.repeat(innerWidth) + chalk.cyan(BOX.v));

  // Help bar
  const helpText = chalk.dim(`  ↑↓ Navigate  Enter Select  Esc Back  q Quit`);
  lines.push(chalk.cyan(BOX.v) + pad(helpText, innerWidth) + chalk.cyan(BOX.v));

  lines.push(renderFooter(termWidth));

  return lines.join('\n');
}
