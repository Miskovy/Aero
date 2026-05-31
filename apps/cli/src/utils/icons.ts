/**
 * icons.ts — Centralized, theme-aware icon system.
 *
 * Provides a single lookup for every glyph used in the CLI.
 * All icons use universally-safe Unicode geometric symbols by default
 * (the 'modern' theme). An 'ascii' fallback is available for truly
 * legacy terminals that can't render even basic Unicode.
 *
 * Usage:
 *   import { icons } from '../utils/icons.js';
 *   console.log(icons.success, 'Deployment completed');
 *   //  ✓ Deployment completed
 */

import ConfigManager from './config.js';

// ─── Icon Maps ───────────────────────────────────────────────────────────────

interface IconSet {
  // Navigation & selection
  pointer: string;    // active menu item cursor
  pointerSmall: string;
  back: string;

  // Status indicators
  success: string;
  error: string;
  warning: string;
  info: string;
  dot: string;        // status dot (used with chalk coloring)
  clock: string;

  // Actions
  create: string;
  deploy: string;
  delete: string;
  start: string;
  stop: string;
  restart: string;
  refresh: string;
  inspect: string;
  edit: string;
  cancel: string;

  // Resources
  service: string;
  project: string;
  node: string;
  env: string;
  logs: string;
  marketplace: string;
  chat: string;
  settings: string;

  // Auth
  login: string;
  logout: string;
  register: string;
  github: string;

  // Deployment phases
  clone: string;
  build: string;
  healthCheck: string;
  routing: string;
  rollback: string;
  runtime: string;

  // Domain / network
  domain: string;
  cloud: string;
  local: string;

  // Misc
  brand: string;      // Aero brand mark
  separator: string;  // thin horizontal line
  exit: string;
}

const MODERN: IconSet = {
  pointer:      '▸',
  pointerSmall: '›',
  back:         '‹',

  success:  '✓',
  error:    '✗',
  warning:  '!',
  info:     '·',
  dot:      '●',
  clock:    '◷',

  create:   '+',
  deploy:   '▲',
  delete:   '×',
  start:    '▶',
  stop:     '■',
  restart:  '↻',
  refresh:  '↻',
  inspect:  '◉',
  edit:     '∎',
  cancel:   '×',

  service:     '▪',
  project:     '▫',
  node:        '⬢',
  env:         '◈',
  logs:        '≡',
  marketplace: '◆',
  chat:        '▷',
  settings:    '⚙',

  login:    '→',
  logout:   '←',
  register: '□',
  github:   '◌',

  clone:       '↓',
  build:       '⚒',
  healthCheck: '♥',
  routing:     '⇄',
  rollback:    '↩',
  runtime:     '●',

  domain: '◎',
  cloud:  '☁',
  local:  '◇',

  brand:     '◆',
  separator: '─',
  exit:      '⏻',
};

const ASCII: IconSet = {
  pointer:      '>',
  pointerSmall: '>',
  back:         '<',

  success:  '[ok]',
  error:    '[!!]',
  warning:  '[!]',
  info:     '[i]',
  dot:      '*',
  clock:    '@',

  create:   '[+]',
  deploy:   '[^]',
  delete:   '[x]',
  start:    '[>]',
  stop:     '[=]',
  restart:  '[~]',
  refresh:  '[~]',
  inspect:  '[?]',
  edit:     '[e]',
  cancel:   '[x]',

  service:     '#',
  project:     '#',
  node:        '#',
  env:         '$',
  logs:        '=',
  marketplace: '*',
  chat:        '>',
  settings:    '*',

  login:    '->',
  logout:   '<-',
  register: '[]',
  github:   '()',

  clone:       'v',
  build:       '#',
  healthCheck: '+',
  routing:     '<>',
  rollback:    '<<',
  runtime:     '*',

  domain: '@',
  cloud:  '~',
  local:  'o',

  brand:     '*',
  separator: '-',
  exit:      '[Q]',
};

// ─── Resolver ────────────────────────────────────────────────────────────────

function resolveIcons(): IconSet {
  const theme = ConfigManager.get('theme');
  return theme === 'ascii' ? ASCII : MODERN;
}

/**
 * A proxy that always resolves icons from the active theme at access time.
 * This means if the user changes theme mid-session, icons update immediately.
 */
export const icons: IconSet = new Proxy({} as IconSet, {
  get(_target, prop: string) {
    const set = resolveIcons();
    return (set as any)[prop] ?? '?';
  },
});

export default icons;
