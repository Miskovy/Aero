import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest } from '../api/api.js';

export async function marketplaceListAction() {
  const s = p.spinner();
  s.start('Fetching available templates from Marketplace...');

  try {
    const templates = await apiRequest<any[]>({ method: 'GET', url: '/marketplace/templates' });
    s.stop('Marketplace templates loaded');
    
    if (templates.length === 0) {
      p.log.warn('No templates found in the marketplace.');
      return;
    }

    console.log('\n' + chalk.bold('📦 Available Marketplace Templates') + '\n');
    
    templates.forEach((template: Record<string, any>) => {
      console.log(`${chalk.cyan.bold(template.name)} ${chalk.gray(`(v${template.version})`)}`);
      console.log(`ID: ${template.id}`);
      console.log(chalk.gray(template.description));
      console.log(`Publisher: ${template.publisher} | Rating: ${template.rating}/5.0`);
      console.log(chalk.gray('----------------------------------------'));
    });
    
    console.log(`\nTo deploy a template, run: ${chalk.cyan('aero marketplace deploy')}\n`);

  } catch (error: unknown) {
    s.stop('Failed to fetch templates');
    const err = error as { response?: { data?: { message?: string } }, message?: string };
    p.log.error(err.response?.data?.message || err.message || 'An unknown error occurred.');
  }
}

export async function marketplaceDeployAction() {
  try {
    // 1. Fetch organizations
    const orgs = await apiRequest<any[]>({ method: 'GET', url: '/organizations' });

    if (orgs.length === 0) {
      p.log.error('You must belong to an organization first.');
      return;
    }

    const orgId = await p.select({
      message: 'Select an organization:',
      options: orgs.map((o: Record<string, any>) => ({ value: o.id, label: o.name })),
    });
    if (p.isCancel(orgId)) return process.exit(0);

    // 2. Fetch projects
    const projects = await apiRequest<any[]>({ method: 'GET', url: `/organizations/${orgId}/projects` });

    if (projects.length === 0) {
      p.log.error('No projects found. Create a project first.');
      return;
    }

    const projectId = await p.select({
      message: 'Select a project to deploy to:',
      options: projects.map((proj: Record<string, any>) => ({ value: proj.id, label: proj.name })),
    });
    if (p.isCancel(projectId)) return process.exit(0);

    // 3. Fetch Templates
    const s = p.spinner();
    s.start('Fetching templates...');
    const templates = await apiRequest<any[]>({ method: 'GET', url: '/marketplace/templates' });
    s.stop();

    if (templates.length === 0) {
      p.log.error('No templates available.');
      return;
    }

    const templateId = await p.select({
      message: 'Select a template to deploy:',
      options: templates.map((t: Record<string, any>) => ({ 
        value: t.id, 
        label: `${t.name} - ${t.description.substring(0, 50)}...` 
      })),
    });
    if (p.isCancel(templateId)) return process.exit(0);

    // 4. Fetch specific template to check variables
    s.start('Loading template details...');
    const template = await apiRequest<Record<string, any>>({ method: 'GET', url: `/marketplace/templates/${templateId}` });
    s.stop();

    const envVars: Record<string, string> = {};

    if (template.variables && template.variables.length > 0) {
      p.log.info('This template requires some configuration:');
      
      for (const v of template.variables) {
        const val = await p.text({
          message: `${v.key} ${v.required ? chalk.red('*') : ''} - ${chalk.gray(v.description)}`,
          placeholder: v.default || '',
          validate: (value) => {
            if (v.required && !value && !v.default) return 'This variable is required';
          }
        });
        if (p.isCancel(val)) return process.exit(0);
        
        envVars[v.key] = (val as string) || v.default || '';
      }
    }

    const confirm = await p.confirm({
      message: `Deploy ${template.name} now?`
    });
    if (p.isCancel(confirm) || !confirm) return p.outro('Cancelled');

    // 5. Deploy
    s.start('Deploying template...');
    await apiRequest({
      method: 'POST',
      url: `/projects/${projectId}/marketplace/deploy/${templateId}`,
      data: { envVars }
    });
    s.stop('Deployment initiated successfully!');

    p.outro(chalk.green(`Template deployed! Run ${chalk.cyan('aero services')} to view it.`));

  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }, message?: string };
    p.log.error(err.response?.data?.message || err.message || 'An unknown error occurred.');
  }
}

export function createMarketplaceCommand() {
  const cmd = new Command('marketplace')
    .description('Browse and deploy 1-click templates from the Aero Marketplace');

  cmd
    .command('list')
    .description('List available marketplace templates')
    .action(marketplaceListAction);

  cmd
    .command('deploy')
    .description('Deploy a template from the marketplace')
    .action(marketplaceDeployAction);

  return cmd;
}
