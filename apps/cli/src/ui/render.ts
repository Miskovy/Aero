import chalk from 'chalk';

// ─── Box Drawing Characters ──────────────────────────────────────────────────
const BOX = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║',
  tMid: '╦', bMid: '╩',
  lMid: '╠', rMid: '╣', cross: '╬',
  // Single-line variants for inner dividers
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
  const visible = stripAnsi(str);
  if (visible.length <= maxLen) return str;
  return visible.substring(0, maxLen - 1) + '…';
}

// ─── Status Indicators ──────────────────────────────────────────────────────

export function statusDot(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'connected':
    case 'running':
    case 'online':
    case 'completed':
      return chalk.green('●');
    case 'degraded':
    case 'deploying':
    case 'building':
    case 'queued':
      return chalk.yellow('●');
    case 'disconnected':
    case 'failed':
    case 'offline':
    case 'stopped':
      return chalk.red('●');
    default:
      return chalk.gray('●');
  }
}

export function statusColor(status: string): (str: string) => string {
  switch (status.toLowerCase()) {
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

export function renderLine(label: string, value: string, width: number): string {
  const content = `  ${label}${value}`;
  return `${BOX.v} ${pad(content, width - 2)} ${BOX.v}`;
}

/** Renders a full-width box with a title and key-value rows */
export function renderPanel(title: string, rows: string[], width: number): string[] {
  const lines: string[] = [];
  const innerWidth = width - 4; // account for "║ " and " ║"

  // Title
  lines.push(`${BOX.v} ${chalk.bold.white(pad(title, innerWidth))} ${BOX.v}`);
  lines.push(`${BOX.v} ${chalk.dim(BOX.hThin.repeat(innerWidth))} ${BOX.v}`);

  for (const row of rows) {
    lines.push(`${BOX.v} ${pad(row, innerWidth)} ${BOX.v}`);
  }

  return lines;
}

/** Renders two panels side by side separated by a vertical line */
export function renderTwoColumns(
  leftLines: string[],
  rightLines: string[],
  leftWidth: number,
  rightWidth: number,
): string[] {
  const maxRows = Math.max(leftLines.length, rightLines.length);
  const result: string[] = [];

  // Top divider
  result.push(
    `${BOX.lMid}${BOX.h.repeat(leftWidth)}${BOX.tMid}${BOX.h.repeat(rightWidth)}${BOX.rMid}`
  );

  for (let i = 0; i < maxRows; i++) {
    const left = leftLines[i] || '';
    const right = rightLines[i] || '';

    const leftInner = i < leftLines.length ? left : '';
    const rightInner = i < rightLines.length ? right : '';

    const lContent = pad(leftInner, leftWidth - 2);
    const rContent = pad(rightInner, rightWidth - 2);

    result.push(`${BOX.v} ${lContent} ${BOX.vThin} ${rContent} ${BOX.v}`);
  }

  return result;
}

/** Full-width horizontal divider */
export function divider(width: number): string {
  return `${BOX.lMid}${BOX.h.repeat(width)}${BOX.rMid}`;
}

/** Mid divider that splits into two columns */
export function midDivider(leftWidth: number, rightWidth: number): string {
  return `${BOX.lMid}${BOX.h.repeat(leftWidth)}${BOX.cross}${BOX.h.repeat(rightWidth)}${BOX.rMid}`;
}

/** Bottom divider that closes two columns */
export function bottomDivider(leftWidth: number, rightWidth: number): string {
  return `${BOX.lMid}${BOX.h.repeat(leftWidth)}${BOX.bMid}${BOX.h.repeat(rightWidth)}${BOX.rMid}`;
}

// ─── Top-Level Dashboard Renderer ───────────────────────────────────────────

export interface DashboardLayout {
  header: string;      // e.g. "Welcome back, Miskovy!"
  time: string;        // e.g. "18:43 EEST"
  health: { label: string; value: string; dot: string }[];
  services: { label: string; value: string }[];
  nodes: { name: string; status: string }[];
  activity: { message: string; time: string }[];
}

export function renderDashboard(data: DashboardLayout, termWidth?: number): string {
  const width = Math.min(termWidth || process.stdout.columns || 90, 100);
  const innerWidth = width - 2; // inside outer ║ ║
  const halfLeft = Math.floor(innerWidth / 2);
  const halfRight = innerWidth - halfLeft - 1; // -1 for the center divider

  const lines: string[] = [];

  // ── Top border + Brand ──
  lines.push(chalk.cyan(`${BOX.tl}${BOX.h.repeat(innerWidth)}${BOX.tr}`));

  const brand = chalk.bold.cyan('◆ AERO');
  const version = chalk.dim('Self-Hosted Cloud Platform v1.0.0');
  const brandLine = `  ${brand}${' '.repeat(Math.max(1, innerWidth - stripAnsi(brand).length - stripAnsi(version).length - 4))}${version}  `;
  lines.push(chalk.cyan(BOX.v) + pad(brandLine, innerWidth) + chalk.cyan(BOX.v));

  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(innerWidth)}${BOX.rMid}`));

  // ── Welcome line ──
  const welcome = `  ${data.header}`;
  const timePart = `${chalk.dim('✦')} ${chalk.dim(data.time)}  `;
  const welcomeGap = Math.max(1, innerWidth - stripAnsi(welcome).length - stripAnsi(timePart).length);
  const welcomeLine = welcome + ' '.repeat(welcomeGap) + timePart;
  lines.push(chalk.cyan(BOX.v) + pad(welcomeLine, innerWidth) + chalk.cyan(BOX.v));

  // ── Health + Services side by side ──
  const healthRows: string[] = [];
  healthRows.push(chalk.bold.white('SYSTEM HEALTH'));
  healthRows.push(chalk.dim(BOX.hThin.repeat(halfLeft - 4)));
  for (const item of data.health) {
    const lbl = chalk.gray(item.label.padEnd(12));
    healthRows.push(`${item.dot} ${lbl}${item.value}`);
  }

  const serviceRows: string[] = [];
  serviceRows.push(chalk.bold.white('SERVICES'));
  serviceRows.push(chalk.dim(BOX.hThin.repeat(halfRight - 4)));
  for (const item of data.services) {
    const lbl = chalk.gray(item.label.padEnd(14));
    serviceRows.push(`${lbl}${item.value}`);
  }

  // Pad to same height
  const maxTop = Math.max(healthRows.length, serviceRows.length);
  while (healthRows.length < maxTop) healthRows.push('');
  while (serviceRows.length < maxTop) serviceRows.push('');

  // Column divider
  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(halfLeft)}${BOX.tMid}${BOX.h.repeat(halfRight)}${BOX.rMid}`));

  for (let i = 0; i < maxTop; i++) {
    const l = pad(healthRows[i], halfLeft - 2);
    const r = pad(serviceRows[i], halfRight - 2);
    lines.push(`${chalk.cyan(BOX.v)} ${l} ${chalk.cyan(BOX.vThin)} ${r} ${chalk.cyan(BOX.v)}`);
  }

  // ── Nodes + Recent Activity side by side ──
  const nodeRows: string[] = [];
  nodeRows.push(chalk.bold.white('NODES'));
  nodeRows.push(chalk.dim(BOX.hThin.repeat(halfLeft - 4)));
  if (data.nodes.length === 0) {
    nodeRows.push(chalk.dim('  No nodes connected'));
  } else {
    for (const n of data.nodes.slice(0, 5)) {
      const dot = statusDot(n.status);
      nodeRows.push(`${dot} ${chalk.white(n.name.padEnd(18))}${statusColor(n.status)(n.status)}`);
    }
  }

  const activityRows: string[] = [];
  activityRows.push(chalk.bold.white('RECENT ACTIVITY'));
  activityRows.push(chalk.dim(BOX.hThin.repeat(halfRight - 4)));
  if (data.activity.length === 0) {
    activityRows.push(chalk.dim('  No recent activity'));
  } else {
    for (const a of data.activity.slice(0, 5)) {
      const msg = truncate(a.message, halfRight - 16);
      activityRows.push(`${chalk.white(pad(msg, halfRight - 14))}${chalk.dim(a.time)}`);
    }
  }

  const maxBottom = Math.max(nodeRows.length, activityRows.length);
  while (nodeRows.length < maxBottom) nodeRows.push('');
  while (activityRows.length < maxBottom) activityRows.push('');

  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(halfLeft)}${BOX.cross}${BOX.h.repeat(halfRight)}${BOX.rMid}`));

  for (let i = 0; i < maxBottom; i++) {
    const l = pad(nodeRows[i], halfLeft - 2);
    const r = pad(activityRows[i], halfRight - 2);
    lines.push(`${chalk.cyan(BOX.v)} ${l} ${chalk.cyan(BOX.vThin)} ${r} ${chalk.cyan(BOX.v)}`);
  }

  // ── Bottom border for columns ──
  lines.push(chalk.cyan(`${BOX.lMid}${BOX.h.repeat(halfLeft)}${BOX.bMid}${BOX.h.repeat(halfRight)}${BOX.rMid}`));

  // ── Empty padding line before menu ──
  lines.push(chalk.cyan(BOX.v) + ' '.repeat(innerWidth) + chalk.cyan(BOX.v));

  return lines.join('\n');
}

/** Renders the bottom border of the outer frame */
export function renderFooter(termWidth?: number): string {
  const width = Math.min(termWidth || process.stdout.columns || 90, 100);
  const innerWidth = width - 2;
  return chalk.cyan(`${BOX.bl}${BOX.h.repeat(innerWidth)}${BOX.br}`);
}
