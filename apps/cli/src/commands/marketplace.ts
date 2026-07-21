/**
 * marketplace.ts — Marketplace template browsing and deployment.
 *
 * Fixed: process.exit(0) on cancel replaced with return.
 * Uses requireAuth guard and icons system.
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth, unwrapData } from '../api/api.js';
import icons from '../utils/icons.js';
import { renderTable } from '../utils/tables.js';

// ─── List Templates ──────────────────────────────────────────────────────────

export async function marketplaceListAction() {
  if (!requireAuth()) return;

  const s = p.spinner();
  s.start('Fetching available templates from Marketplace...');

  try {
    const raw = await apiRequest<any>({ method: 'GET', url: '/marketplace/templates' });
    const templates = unwrapData(raw);
    s.stop(`${icons.success} Marketplace templates loaded`);

    if (templates.length === 0) {
      p.log.warn('No templates found in the marketplace.');
      return;
    }

    const output = renderTable(
      [
        { header: 'NAME', accessor: (r) => chalk.cyan.bold(r.name), maxWidth: 24 },
        { header: 'VERSION', accessor: (r) => chalk.dim(`v${r.version}`), maxWidth: 10 },
        { header: 'PUBLISHER', accessor: 'publisher', maxWidth: 18 },
        { header: 'RATING', accessor: (r) => `${r.rating}/5.0`, maxWidth: 10 },
        { header: 'DESCRIPTION', accessor: (r) => (r.description || '').substring(0, 40), maxWidth: 42 },
      ],
      templates,
      { title: `${icons.marketplace} Marketplace Templates` },
    );

    console.log(output);
    console.log(chalk.dim(`  To deploy a template, run: ${chalk.cyan('aero marketplace deploy')}\n`));
  } catch (error: any) {
    s.stop(`${icons.error} Failed to fetch templates`);
    p.log.error(error.message || 'An unknown error occurred.');
  }
}

// ─── Deploy Template ─────────────────────────────────────────────────────────

export async function marketplaceDeployAction() {
  if (!requireAuth()) return;

  try {
    // 1. Fetch organizations
    const rawOrgs = await apiRequest<any>({ method: 'GET', url: '/organizations' });
    const orgs = unwrapData(rawOrgs);

    if (orgs.length === 0) {
      p.log.error('You must belong to an organization first.');
      return;
    }

    const orgId = await p.select({
      message: 'Select an organization:',
      options: orgs.map((o: Record<string, any>) => ({ value: o.id, label: o.name })),
    });
    if (p.isCancel(orgId)) return;

    // 2. Fetch projects
    const rawProjects = await apiRequest<any>({ method: 'GET', url: `/projects?orgId=${orgId}` });
    const projects = unwrapData(rawProjects);

    if (projects.length === 0) {
      p.log.error('No projects found. Create a project first.');
      return;
    }

    const projectId = await p.select({
      message: 'Select a project to deploy to:',
      options: projects.map((proj: Record<string, any>) => ({ value: proj.id, label: proj.name })),
    });
    if (p.isCancel(projectId)) return;

    // 3. Fetch Templates
    const s = p.spinner();
    s.start('Fetching templates...');
    const rawTemplates = await apiRequest<any>({ method: 'GET', url: '/marketplace/templates' });
    const templates = unwrapData(rawTemplates);
    s.stop('');

    if (templates.length === 0) {
      p.log.error('No templates available.');
      return;
    }

    const templateId = await p.select({
      message: 'Select a template to deploy:',
      options: templates.map((t: Record<string, any>) => ({
        value: t.id,
        label: `${t.name} - ${(t.description || '').substring(0, 50)}...`,
      })),
    });
    if (p.isCancel(templateId)) return;

    // 4. Fetch specific template to check variables
    s.start('Loading template details...');
    const template = await apiRequest<Record<string, any>>({
      method: 'GET',
      url: `/marketplace/templates/${templateId}`,
    });
    s.stop('');

    const envVars: Record<string, string> = {};

    if (template.variables && template.variables.length > 0) {
      p.log.info('This template requires some configuration:');

      for (const v of template.variables) {
        const val = await p.text({
          message: `${v.key} ${v.required ? chalk.red('*') : ''} - ${chalk.gray(v.description)}`,
          placeholder: v.default || '',
          validate: (value) => {
            if (v.required && !value && !v.default) return 'This variable is required';
            return;
          },
        });
        if (p.isCancel(val)) return;

        envVars[v.key] = (val as string) || v.default || '';
      }
    }

    const confirm = await p.confirm({
      message: `Deploy ${template.name} now?`,
    });
    if (p.isCancel(confirm) || !confirm) return p.outro('Cancelled');

    // 5. Deploy
    s.start('Deploying template...');
    await apiRequest({
      method: 'POST',
      url: `/projects/${projectId}/marketplace/deploy/${templateId}`,
      data: { envVars },
    });
    s.stop(`${icons.success} Deployment initiated successfully!`);

    p.outro(chalk.green(`Template deployed! Run ${chalk.cyan('aero services')} to view it.`));
  } catch (error: any) {
    p.log.error(error.message || 'An unknown error occurred.');
  }
}

// ─── Commander Setup ─────────────────────────────────────────────────────────

export function createMarketplaceCommand() {
  const cmd = new Command('marketplace')
    .description('Browse and deploy 1-click templates from the Aero Marketplace');

  cmd.command('list').description('List available marketplace templates').action(marketplaceListAction);
  cmd.command('deploy').description('Deploy a template from the marketplace').action(marketplaceDeployAction);

  return cmd;
}
