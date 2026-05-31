/**
 * chat.ts — AI Chat assistant command.
 *
 * Currently a placeholder — marked as [Coming Soon].
 * Does NOT call process.exit() so the dashboard stays alive.
 */

import chalk from 'chalk';
import icons from '../utils/icons.js';

export async function chatAction() {
  console.log('');
  console.log(chalk.bold(`  ${icons.chat} Aero AI Assistant`));
  console.log(chalk.dim(`  ${icons.separator.repeat(40)}`));
  console.log('');
  console.log(chalk.yellow('  This feature is coming soon!'));
  console.log(chalk.dim('  The Aero AI Assistant will help you manage'));
  console.log(chalk.dim('  deployments, troubleshoot issues, and more.'));
  console.log('');
}
