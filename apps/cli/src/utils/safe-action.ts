/**
 * safe-action.ts — TUI-safe action wrapper.
 *
 * When the interactive dashboard calls a command action (e.g. servicesListAction),
 * the TUI is in raw mode with cursor hidden. This wrapper:
 *
 *   1. Exits raw mode so the action can use normal stdin/stdout
 *   2. Shows the cursor
 *   3. Clears the screen
 *   4. Runs the action inside try/catch
 *   5. On error, prints a clean error message
 *   6. Pauses with "Press Enter to return to menu..." so the user can read output
 *   7. Resumes stdin before returning control to the TUI loop
 *
 * CRITICAL FIX: waitForEnter() now uses raw-mode keypress detection instead of
 * readline.createInterface(), which was taking stdin ownership and leaving it
 * paused after closing — causing the main menu to become uninteractable.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';

/**
 * Wrap a CLI action for safe execution from the TUI dashboard.
 *
 * @param action - The async action function to run
 * @param label  - Human-readable label for error messages (e.g. "List Services")
 */
export async function safeAction(action: () => Promise<void>, label?: string): Promise<void> {
  // Pause raw mode so the action can use normal prompts
  const wasRaw = process.stdin.isRaw;
  if (wasRaw) {
    try { process.stdin.setRawMode(false); } catch { /* ignore */ }
  }

  // Show cursor
  process.stdout.write('\x1B[?25h');

  // Clear screen for the action's output
  console.clear();

  try {
    await action();
  } catch (err: any) {
    const message = err?.message || 'An unexpected error occurred.';
    console.log('');
    p.log.error(chalk.red(`${label ? `[${label}] ` : ''}${message}`));
  }

  // Always pause before returning to menu
  await waitForEnter();

  // CRITICAL: Ensure stdin is flowing and ready for the next TUI raw-mode cycle.
  // Without this, stdin may stay paused and the TUI menu becomes unresponsive.
  try { process.stdin.resume(); } catch { /* ignore */ }
}

/**
 * Display a "Press Enter to return..." prompt and wait.
 *
 * Uses raw-mode keypress detection instead of readline.createInterface()
 * to avoid taking ownership of stdin, which was the root cause of the
 * "uninteractable main menu" bug.
 */
async function waitForEnter(): Promise<void> {
  return new Promise<void>((resolve) => {
    console.log('');
    process.stdout.write(chalk.dim('  Press Enter to return to menu...'));

    // Enter raw mode to detect individual key presses
    try { process.stdin.setRawMode(true); } catch { /* ignore */ }
    process.stdin.resume();

    const onData = (data: Buffer) => {
      const key = data.toString();

      // Enter key (CR or LF), or Escape, or Ctrl+C
      if (key === '\r' || key === '\n' || key === '\x1B' || key === '\x03') {
        cleanup();
        process.stdout.write('\n');
        resolve();
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      process.stdin.removeListener('data', onData);
      // Exit raw mode so the caller gets a clean stdin state
      try { process.stdin.setRawMode(false); } catch { /* ignore */ }
    };

    process.stdin.on('data', onData);

    // Safety: resolve after 60s even if no input
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      process.stdout.write('\n');
      resolve();
    }, 60_000);
  });
}

/**
 * Install a global safety net for the terminal.
 * Call once at CLI startup. Ensures cursor and raw mode
 * are restored on any exit path.
 */
export function installTerminalSafetyNet(): void {
  const restore = () => {
    // Show cursor
    try { process.stdout.write('\x1B[?25h'); } catch { /* ignore */ }
    // Disable raw mode
    try { process.stdin.setRawMode(false); } catch { /* ignore */ }
    // Exit alternate screen buffer to restore user's terminal state
    try { process.stdout.write('\x1B[?1049l'); } catch { /* ignore */ }
  };

  process.on('exit', restore);
  process.on('SIGINT', () => { restore(); process.exit(0); });
  process.on('SIGTERM', () => { restore(); process.exit(0); });
  process.on('uncaughtException', (err) => {
    restore();
    console.error(chalk.red('\nFatal error:'), err.message);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    restore();
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error(chalk.red('\nUnhandled error:'), msg);
    process.exit(1);
  });
}

export default safeAction;
