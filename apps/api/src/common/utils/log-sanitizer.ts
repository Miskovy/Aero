/**
 * Sanitizes terminal log messages to ensure they only contain characters
 * that are safe for all database connection encodings (including Windows-1252 / WIN1252).
 *
 * Replaces box-drawing Unicode characters (commonly outputted by tools like clack, pnpm, turbo, nest)
 * with their closest ASCII equivalents (+, -, |) and strips other unmappable characters.
 */
export function sanitizeLogMessage(message: string): string {
  if (!message) return message;

  return (
    message
      .replace(/╭/g, '+')
      .replace(/╰/g, '+')
      .replace(/╮/g, '+')
      .replace(/╯/g, '+')
      .replace(/─/g, '-')
      .replace(/│/g, '|')
      .replace(/\u2009/g, ' ') // thin space
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, (char) => {
        const mapping: Record<string, string> = {
          '‘': "'",
          '’': "'",
          '“': '"',
          '”': '"',
          '…': '...',
          '–': '-',
          '—': '-',
        };
        return mapping[char] || '?';
      })
  );
}
