/**
 * projects.ts — Project management commands.
 *
 * Uses professional table renderer, requireAuth guard, and icons system.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest, requireAuth, unwrapData, unwrapItem } from '../api/api.js';
import { renderTable } from '../utils/tables.js';
import icons from '../utils/icons.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function selectOrg(): Promise<string | null> {
  const s = p.spinner();
  s.start('Loading organizations...');

  let orgs: any[];
  try {
    const raw = await apiRequest<any>({ method: 'GET', url: '/organizations' });
    orgs = unwrapData(raw);
    s.stop('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to load organizations.`));
    p.log.error(err.message || 'Unknown error');
    return null;
  }

  if (!orgs || orgs.length === 0) {
    p.log.info('No organizations found. Create one first.');
    return null;
  }

  if (orgs.length === 1) return orgs[0].id;

  const orgId = await p.select({
    message: 'Select an Organization:',
    options: orgs.map((o) => ({ value: o.id, label: o.name || o.slug })),
  });
  if (p.isCancel(orgId)) return null;
  return orgId as string;
}

async function selectProject(orgId: string): Promise<string | null> {
  const s = p.spinner();
  s.start('Loading projects...');

  let projects: any[];
  try {
    const raw = await apiRequest<any>({ method: 'GET', url: `/projects?orgId=${orgId}` });
    projects = unwrapData(raw);
    s.stop('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to load projects.`));
    p.log.error(err.message || 'Unknown error');
    return null;
  }

  if (!projects || projects.length === 0) {
    p.log.info('No projects found in this organization.');
    return null;
  }

  const projectId = await p.select({
    message: 'Select a Project:',
    options: projects.map((proj) => ({
      value: proj.id,
      label: `${proj.name || proj.slug}${proj._count?.services !== undefined ? chalk.dim(` (${proj._count.services} services)`) : ''}`,
    })),
  });
  if (p.isCancel(projectId)) return null;
  return projectId as string;
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function projectsListAction() {
  if (!requireAuth()) return;

  const orgId = await selectOrg();
  if (!orgId) return;

  const s = p.spinner();
  s.start('Fetching projects...');

  try {
    const raw = await apiRequest<any>({ method: 'GET', url: `/projects?orgId=${orgId}` });
    const projects = unwrapData(raw);
    s.stop(`${icons.success} Projects loaded!`);

    if (!projects || projects.length === 0) {
      p.log.info('No projects found in this organization.');
      return;
    }

    const output = renderTable(
      [
        { header: 'NAME', accessor: (r) => r.name || r.slug || '', maxWidth: 24 },
        { header: 'SERVICES', accessor: (r) => String(r._count?.services ?? '?'), maxWidth: 10 },
        { header: 'CREATED', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A', maxWidth: 14 },
        { header: 'ID', accessor: (r) => chalk.dim(r.id?.substring(0, 12) || ''), maxWidth: 14 },
      ],
      projects,
      { title: `${icons.project} Projects` },
    );

    console.log(output);
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to load projects.`));
    p.log.error(err.message || 'Unknown error');
  }
}

// ─── Inspect ─────────────────────────────────────────────────────────────────

export async function projectsInspectAction() {
  if (!requireAuth()) return;

  const orgId = await selectOrg();
  if (!orgId) return;

  const projectId = await selectProject(orgId);
  if (!projectId) return;

  const s = p.spinner();
  s.start('Loading project details...');

  try {
    const proj = await apiRequest<any>({ method: 'GET', url: `/projects/${projectId}` });
    s.stop(`${icons.success} Project loaded.`);

    console.log('');
    console.log(chalk.bold(`  ${icons.inspect} Project Details`));
    console.log(chalk.dim(`  ${icons.separator.repeat(40)}`));
    console.log(`  ${chalk.dim('ID:')}           ${proj.id}`);
    console.log(`  ${chalk.dim('Name:')}         ${chalk.white(proj.name)}`);
    console.log(`  ${chalk.dim('Slug:')}         ${proj.slug}`);
    console.log(`  ${chalk.dim('Description:')}  ${proj.description || chalk.dim('None')}`);
    console.log(`  ${chalk.dim('Services:')}     ${proj._count?.services ?? 0}`);
    console.log(`  ${chalk.dim('Environments:')} ${proj._count?.environments ?? 0}`);
    console.log(`  ${chalk.dim('Created:')}      ${proj.created_at ? new Date(proj.created_at).toLocaleString() : 'N/A'}`);

    if (proj.services && proj.services.length > 0) {
      console.log('');
      console.log(chalk.bold(`  ${icons.service} Services`));
      console.log(chalk.dim(`  ${icons.separator.repeat(40)}`));
      for (const svc of proj.services) {
        const color = svc.status === 'running' ? chalk.green : svc.status === 'failed' ? chalk.red : chalk.yellow;
        console.log(`  ${chalk.dim(icons.pointerSmall)} ${svc.name} ${color(`(${svc.status || 'unknown'})`)} ${chalk.dim(`[${svc.source_type}]`)}`);
      }
    }
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to load project.`));
    p.log.error(err.message || 'Unknown error');
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function projectsCreateAction() {
  if (!requireAuth()) return;

  const orgId = await selectOrg();
  if (!orgId) return;

  const name = await p.text({
    message: 'Enter a name for your new Project:',
    placeholder: 'My Awesome Project',
    validate: (value) => {
      if (!value || !value.trim()) return 'Project name cannot be empty.';
      return;
    },
  });
  if (p.isCancel(name)) return;

  const s = p.spinner();
  s.start('Creating project...');

  try {
    const proj = await apiRequest<any>({
      method: 'POST',
      url: '/projects',
      data: { orgId, name: name as string },
    });
    s.stop(chalk.green(`${icons.success} Project created successfully!`));
    console.log('');
    console.log(`  ${chalk.dim('ID:')}   ${proj.id}`);
    console.log(`  ${chalk.dim('Name:')} ${proj.name}`);
    console.log(`  ${chalk.dim('Slug:')} ${proj.slug}`);
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to create project.`));
    p.log.error(err.message || 'Unknown error');
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function projectsUpdateAction() {
  if (!requireAuth()) return;

  const orgId = await selectOrg();
  if (!orgId) return;

  const projectId = await selectProject(orgId);
  if (!projectId) return;

  const field = await p.select({
    message: 'What would you like to update?',
    options: [
      { value: 'name', label: `${icons.edit} Rename Project` },
      { value: 'description', label: `${icons.edit} Update Description` },
    ],
  });
  if (p.isCancel(field)) return;

  const newValue = await p.text({
    message: field === 'name' ? 'Enter the new project name:' : 'Enter the new description:',
    placeholder: field === 'name' ? 'New Project Name' : 'A brief description of this project',
    validate: (value) => {
      if (field === 'name' && (!value || !value.trim())) return 'Name cannot be empty.';
      return;
    },
  });
  if (p.isCancel(newValue)) return;

  const s = p.spinner();
  s.start('Updating project...');

  try {
    const data = field === 'name' ? { name: newValue as string } : { description: newValue as string };
    const proj = await apiRequest<any>({ method: 'PATCH', url: `/projects/${projectId}`, data });
    s.stop(chalk.green(`${icons.success} Project updated successfully!`));
    console.log(`  ${chalk.dim('Name:')} ${proj.name}`);
    console.log(`  ${chalk.dim('Description:')} ${proj.description || chalk.dim('None')}`);
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to update project.`));
    p.log.error(err.message || 'Unknown error');
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function projectsDeleteAction() {
  if (!requireAuth()) return;

  const orgId = await selectOrg();
  if (!orgId) return;

  const projectId = await selectProject(orgId);
  if (!projectId) return;

  const confirm = await p.confirm({
    message: chalk.red('Are you sure you want to delete this project? This will also delete all services inside it.'),
    initialValue: false,
  });
  if (p.isCancel(confirm) || !confirm) {
    p.log.info('Deletion cancelled.');
    return;
  }

  const s = p.spinner();
  s.start('Deleting project...');

  try {
    const result = await apiRequest<any>({ method: 'DELETE', url: `/projects/${projectId}` });
    s.stop(chalk.green(`${icons.success} ${result.message || 'Project deleted successfully!'}`));
  } catch (err: any) {
    s.stop(chalk.red(`${icons.error} Failed to delete project.`));
    p.log.error(err.message || 'Unknown error');
  }
}
