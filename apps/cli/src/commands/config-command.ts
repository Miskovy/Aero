/**
 * config-command.ts — CLI configuration management commands.
 *
 * Provides:
 *   aero config show   — Display current configuration
 *   aero config set    — Set a configuration value
 *   aero config get    — Get a specific configuration value
 *   aero config reset  — Reset all configuration to defaults
 *   aero target <url>  — Shorthand to set the API URL
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ConfigManager, { CliConfig } from '../utils/config.js';
import icons from '../utils/icons.js';
import { renderTable } from '../utils/tables.js';

// ─── Config Show ─────────────────────────────────────────────────────────────

function configShowAction() {
  const config = ConfigManager.getAll();

  console.log('');
  console.log(chalk.bold(`  ${icons.settings} Aero CLI Configuration`));
  console.log(chalk.dim(`  ${icons.separator.repeat(40)}`));
  console.log(chalk.dim(`  Config file: ${ConfigManager.getConfigPath()}`));
  console.log('');

  const rows = [
    { key: 'api-url', value: config.apiUrl, source: process.env.AERO_API_URL ? 'env' : 'config' },
    { key: 'token', value: config.token ? chalk.green('Set (hidden)') : chalk.dim('Not set'), source: process.env.AERO_TOKEN ? 'env' : 'config' },
    { key: 'theme', value: config.theme, source: 'config' },
  ];

  const output = renderTable(
    [
      { header: 'KEY', accessor: 'key', maxWidth: 16 },
      { header: 'VALUE', accessor: 'value', maxWidth: 40 },
      { header: 'SOURCE', accessor: (r) => r.source === 'env' ? chalk.yellow('env') : chalk.cyan('file'), maxWidth: 8 },
    ],
    rows,
  );

  console.log(output);
}

// ─── Config Set ──────────────────────────────────────────────────────────────

function configSetAction(key: string, value: string) {
  const validKeys: Record<string, keyof CliConfig> = {
    'api-url': 'apiUrl',
    'apiUrl': 'apiUrl',
    'theme': 'theme',
  };

  const configKey = validKeys[key];
  if (!configKey) {
    console.log(chalk.red(`\n  ${icons.error} Unknown configuration key: '${key}'`));
    console.log(chalk.dim(`  Valid keys: api-url, theme`));
    return;
  }

  if (configKey === 'theme' && value !== 'modern' && value !== 'ascii') {
    console.log(chalk.red(`\n  ${icons.error} Invalid theme value: '${value}'`));
    console.log(chalk.dim(`  Valid themes: modern, ascii`));
    return;
  }

  ConfigManager.set(configKey as any, value as any);
  console.log(chalk.green(`\n  ${icons.success} Set ${key} = ${value}`));
}

// ─── Config Get ──────────────────────────────────────────────────────────────

function configGetAction(key: string) {
  const validKeys: Record<string, string> = {
    'api-url': 'apiUrl',
    'apiUrl': 'apiUrl',
    'theme': 'theme',
    'token': 'token',
  };

  const configKey = validKeys[key];
  if (!configKey) {
    console.log(chalk.red(`\n  ${icons.error} Unknown configuration key: '${key}'`));
    return;
  }

  const value = ConfigManager.get(configKey as any);
  if (configKey === 'token') {
    console.log(value ? chalk.green('\n  Token is set') : chalk.dim('\n  Token is not set'));
  } else {
    console.log(`\n  ${key} = ${value}`);
  }
}

// ─── Config Reset ────────────────────────────────────────────────────────────

function configResetAction() {
  ConfigManager.reset();
  console.log(chalk.green(`\n  ${icons.success} Configuration reset to defaults.`));
}

// ─── Target Shorthand ────────────────────────────────────────────────────────

function targetAction(url: string) {
  if (!url) {
    console.log(`\n  Current target: ${chalk.cyan(ConfigManager.get('apiUrl'))}`);
    return;
  }

  ConfigManager.set('apiUrl', url);
  console.log(chalk.green(`\n  ${icons.success} Target set to ${chalk.cyan(url)}`));
}

// ─── Commander Registration ──────────────────────────────────────────────────

export function createConfigCommand(): Command {
  const cmd = new Command('config').description('Manage CLI configuration');

  cmd.command('show').description('Display current configuration').action(configShowAction);
  cmd.command('set <key> <value>').description('Set a configuration value').action(configSetAction);
  cmd.command('get <key>').description('Get a specific configuration value').action(configGetAction);
  cmd.command('reset').description('Reset all configuration to defaults').action(configResetAction);

  return cmd;
}

export function createTargetCommand(): Command {
  return new Command('target')
    .description('Set the Aero Control Plane URL')
    .argument('[url]', 'The URL of the Aero Control Plane API')
    .action(targetAction);
}
