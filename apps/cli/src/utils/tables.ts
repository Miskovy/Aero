/**
 * tables.ts — Professional box-drawn table renderer for terminal output.
 *
 * Produces clean, bordered tables using Unicode box-drawing characters:
 *
 *   ╔══════════╦════════╦════════╗
 *   ║ NAME     ║ STATUS ║ TYPE   ║
 *   ╠══════════╬════════╬════════╣
 *   ║ my-api   ║ running║ git    ║
 *   ║ redis    ║ stopped║ docker ║
 *   ╚══════════╩════════╩════════╝
 *
 * Auto-calculates column widths. Supports chalk-colored values.
 */

import chalk from 'chalk';

// ─── Box Characters ──────────────────────────────────────────────────────────

const B = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═',  v: '║',
  tMid: '╦', bMid: '╩',
  lMid: '╠', rMid: '╣', cross: '╬',
};

// ─── ANSI strip ──────────────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

function padRight(str: string, width: number): string {
  const diff = width - visibleLength(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function truncate(str: string, maxLen: number): string {
  const visible = stripAnsi(str);
  if (visible.length <= maxLen) return str;
  // Truncation strips ANSI since we can't split mid-sequence
  return visible.substring(0, maxLen - 1) + '…';
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface TableColumn {
  /** Column header label */
  header: string;
  /** Key to pull from row data, or a function to extract the cell value */
  accessor: string | ((row: Record<string, any>) => string);
  /** Optional max width (defaults to auto) */
  maxWidth?: number;
  /** Minimum width (defaults to header length) */
  minWidth?: number;
  /** Alignment (defaults to 'left') */
  align?: 'left' | 'right';
}

export interface TableOptions {
  /** Max total width (defaults to terminal width or 100) */
  maxTotalWidth?: number;
  /** Color for the borders */
  borderColor?: (str: string) => string;
  /** Title rendered above the table */
  title?: string;
  /** Indent from left edge */
  indent?: number;
}

/**
 * Render a professional, bordered table to a string.
 *
 * @example
 * ```ts
 * const output = renderTable(
 *   [{ header: 'NAME', accessor: 'name' }, { header: 'STATUS', accessor: 'status' }],
 *   [{ name: 'api', status: chalk.green('running') }],
 * );
 * console.log(output);
 * ```
 */
export function renderTable(
  columns: TableColumn[],
  rows: Record<string, any>[],
  options: TableOptions = {},
): string {
  const {
    maxTotalWidth = Math.min(process.stdout.columns || 100, 120),
    borderColor = chalk.cyan,
    title,
    indent = 2,
  } = options;

  const prefix = ' '.repeat(indent);

  // ── Resolve cell values ──
  const cellValues: string[][] = rows.map((row) =>
    columns.map((col) => {
      if (typeof col.accessor === 'function') return col.accessor(row);
      const val = row[col.accessor];
      return val === undefined || val === null ? '' : String(val);
    }),
  );

  // ── Calculate column widths ──
  const colWidths: number[] = columns.map((col, i) => {
    const headerLen = visibleLength(col.header);
    const maxCell = cellValues.reduce((max, row) => Math.max(max, visibleLength(row[i])), 0);
    let width = Math.max(headerLen, maxCell, col.minWidth || 0);
    if (col.maxWidth) width = Math.min(width, col.maxWidth);
    return width;
  });

  // ── Clamp total width ──
  const borderOverhead = indent + 1 + columns.length + columns.length * 2; // ║ + padding
  const availableContent = maxTotalWidth - borderOverhead;
  const totalContent = colWidths.reduce((sum, w) => sum + w, 0);

  if (totalContent > availableContent && availableContent > 0) {
    const scale = availableContent / totalContent;
    for (let i = 0; i < colWidths.length; i++) {
      colWidths[i] = Math.max(4, Math.floor(colWidths[i] * scale));
    }
  }

  // ── Build horizontal lines ──
  const topLine    = borderColor(`${prefix}${B.tl}${colWidths.map(w => B.h.repeat(w + 2)).join(B.tMid)}${B.tr}`);
  const midLine    = borderColor(`${prefix}${B.lMid}${colWidths.map(w => B.h.repeat(w + 2)).join(B.cross)}${B.rMid}`);
  const bottomLine = borderColor(`${prefix}${B.bl}${colWidths.map(w => B.h.repeat(w + 2)).join(B.bMid)}${B.br}`);

  const makeRow = (cells: string[]): string => {
    const inner = cells.map((cell, i) => {
      const truncated = truncate(cell, colWidths[i]);
      return ` ${padRight(truncated, colWidths[i])} `;
    }).join(borderColor(B.v));
    return `${prefix}${borderColor(B.v)}${inner}${borderColor(B.v)}`;
  };

  // ── Assemble ──
  const lines: string[] = [];

  if (title) {
    lines.push('');
    lines.push(`${prefix}${chalk.bold(title)}`);
  }

  lines.push(topLine);

  // Header row
  const headerCells = columns.map((col) => chalk.bold.white(col.header));
  lines.push(makeRow(headerCells));
  lines.push(midLine);

  // Data rows
  if (cellValues.length === 0) {
    const emptyMsg = chalk.dim('No data');
    const totalInner = colWidths.reduce((sum, w) => sum + w + 2, 0) + colWidths.length - 1;
    const padded = padRight(`  ${emptyMsg}`, totalInner);
    lines.push(`${prefix}${borderColor(B.v)}${padded}${borderColor(B.v)}`);
  } else {
    for (const row of cellValues) {
      lines.push(makeRow(row));
    }
  }

  lines.push(bottomLine);
  lines.push('');

  return lines.join('\n');
}

export default renderTable;
