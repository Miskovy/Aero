/**
 * ConfigManager — Single source of truth for all CLI configuration.
 *
 * Responsibilities:
 *   1. Load / persist settings from ~/.aero/config.json
 *   2. Provide environment-variable overrides (AERO_TOKEN, AERO_API_URL)
 *   3. Expose a typed get/set API so no other file ever touches the filesystem
 *
 * Priority cascade (highest wins):
 *   Environment variable → In-memory cache → Stored config file → Default
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ─── Schema ──────────────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://aero-y6mm.onrender.com';

export interface CliConfig {
  /** JWT auth token persisted between sessions */
  token: string | null;
  /** Base URL of the Aero control plane API */
  apiUrl: string;
  /** Icon theme: 'modern' (geometric glyphs) | 'ascii' (7-bit safe) */
  theme: 'modern' | 'ascii';
}

const DEFAULTS: Readonly<CliConfig> = Object.freeze({
  token: null,
  apiUrl: DEFAULT_API_URL,
  theme: 'modern',
});

// ─── Paths ───────────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), '.aero');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ─── Internal state ──────────────────────────────────────────────────────────

let cache: CliConfig = { ...DEFAULTS };
let loaded = false;

// ─── Private helpers ─────────────────────────────────────────────────────────

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      // Only pick known keys to avoid polluting the cache
      if (typeof parsed.token === 'string') cache.token = parsed.token;
      if (typeof parsed.apiUrl === 'string') cache.apiUrl = parsed.apiUrl;
      if (parsed.theme === 'modern' || parsed.theme === 'ascii') {
        cache.theme = parsed.theme;
      }
    }
  } catch {
    // Config file missing or corrupt — use defaults silently
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const serializable: Record<string, unknown> = { ...cache };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(serializable, null, 2), 'utf-8');
  } catch {
    // Filesystem write failed — swallow silently (e.g. read-only home dir)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get a configuration value.
 *
 * Environment variables take highest priority:
 *   AERO_TOKEN  → config.token
 *   AERO_API_URL → config.apiUrl
 */
export function get<K extends keyof CliConfig>(key: K): CliConfig[K] {
  ensureLoaded();

  // Environment overrides (highest priority)
  if (key === 'token' && process.env.AERO_TOKEN) {
    return process.env.AERO_TOKEN as CliConfig[K];
  }
  if (key === 'apiUrl' && process.env.AERO_API_URL) {
    return process.env.AERO_API_URL as CliConfig[K];
  }

  return cache[key];
}

/** Set a configuration value and persist to disk. */
export function set<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
  ensureLoaded();
  cache[key] = value;
  persist();
}

/** Reset all configuration to defaults and persist. */
export function reset(): void {
  cache = { ...DEFAULTS };
  loaded = true;
  persist();
}

/** Return a shallow copy of the full resolved config (with env overrides applied). */
export function getAll(): Readonly<CliConfig> {
  ensureLoaded();
  return {
    token: get('token'),
    apiUrl: get('apiUrl'),
    theme: get('theme'),
  };
}

/** Check whether the user is currently authenticated. */
export function isAuthenticated(): boolean {
  return !!get('token');
}

/** Convenience: clear the token (logout). */
export function clearToken(): void {
  set('token', null);
}

/** Return the config file path (for display in `aero config show`). */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

// ─── Default export as a namespace-like object ───────────────────────────────

const ConfigManager = { get, set, reset, getAll, isAuthenticated, clearToken, getConfigPath };
export default ConfigManager;
