import * as readline from 'readline';
import ora from 'ora';
import { marked } from 'marked';
import markedTerminal from 'marked-terminal';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';

export async function chatAction() {
  marked.setOptions({
    renderer: new markedTerminal()
  } as any);

  console.log(chalk.blue('Starting Aero Assistant. Type "exit" or "quit" to stop.'));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: ')
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      rl.close();
      return;
    }

    if (!input) {
      rl.prompt();
      return;
    }

    const spinner = ora('Aero is thinking...').start();
    
    // Simulate waiting for API/LLM processing
    await setTimeout(800);
    
    spinner.stop();

    const markdownResponse = `### Here is how to manage your resources\n\nYou ran: \`${input}\`. That's a great request!\n\nTo get started, you can also deploy services using:\n\`\`\`bash\naero deploy\n\`\`\`\n\nNeed anything else?`;

    console.log(chalk.cyan('\nAero:'));
    console.log(marked.parse(markdownResponse));
    
    rl.prompt();
  }).on('close', () => {
    console.log(chalk.blue('\nGoodbye!'));
    process.exit(0);
  });
}
