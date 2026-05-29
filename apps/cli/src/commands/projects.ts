import * as p from '@clack/prompts';
import chalk from 'chalk';
import { apiRequest } from '../api/api.js';

/**
 * Helper: prompt user to select an organization, returns orgId
 */
async function selectOrg(): Promise<string | null> {
  const s = p.spinner();
  s.start('Loading organizations...');
  let orgs: any[];
  try {
    orgs = await apiRequest<any[]>({ method: 'GET', url: '/organizations' });
    s.stop('Organizations loaded!');
  } catch (err: any) {
    s.stop(chalk.red('Failed to load organizations.'));
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
    options: orgs.map(o => ({ value: o.id, label: o.name || o.slug }))
  });
  if (p.isCancel(orgId)) return null;
  return orgId as string;
}

/**
 * Helper: prompt user to select a project from an org, returns projectId
 */
async function selectProject(orgId: string): Promise<string | null> {
  const s = p.spinner();
  s.start('Loading projects...');
  let projects: any[];
  try {
    projects = await apiRequest<any[]>({ method: 'GET', url: `/projects?orgId=${orgId}` });
    s.stop('Projects loaded!');
  } catch (err: any) {
    s.stop(chalk.red('Failed to load projects.'));
    p.log.error(err.message || 'Unknown error');
    return null;
  }

  if (!projects || projects.length === 0) {
    p.log.info('No projects found in this organization.');
    return null;
  }

  const projectId = await p.select({
    message: 'Select a Project:',
    options: projects.map(proj => ({
      value: proj.id,
      label: `${proj.name || proj.slug}${proj._count?.services !== undefined ? chalk.dim(` (${proj._count.services} services)`) : ''}`
    }))
  });
  if (p.isCancel(projectId)) return null;
  return projectId as string;
}

/**
 * List all projects in an organization
 */
export async function projectsListAction() {
  const orgId = await selectOrg();
  if (!orgId) return;

  const s = p.spinner();
  s.start('Fetching projects...');
  try {
    const projects = await apiRequest<any[]>({ method: 'GET', url: `/projects?orgId=${orgId}` });
    s.stop('Projects loaded!');

    if (!projects || projects.length === 0) {
      p.log.info('No projects found in this organization.');
      return;
    }

    console.log('');
    console.log(chalk.bold('  ID                                   NAME                 SERVICES   CREATED'));
    console.log(chalk.dim('  ' + '─'.repeat(90)));
    for (const proj of projects) {
      const svcCount = proj._count?.services ?? '?';
      const created = proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'N/A';
      console.log(
        `  ${(proj.id || '').padEnd(36)} ${(proj.name || proj.slug || '').padEnd(20)} ${String(svcCount).padEnd(10)} ${created}`
      );
    }
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red('Failed to load projects.'));
    p.log.error(err.message || 'Unknown error');
  }
}

/**
 * Inspect a specific project and show its services
 */
export async function projectsInspectAction() {
  const orgId = await selectOrg();
  if (!orgId) return;

  const projectId = await selectProject(orgId);
  if (!projectId) return;

  const s = p.spinner();
  s.start('Loading project details...');
  try {
    const proj = await apiRequest<any>({ method: 'GET', url: `/projects/${projectId}` });
    s.stop('Project loaded.');

    console.log('');
    console.log(chalk.bold.blue('  Project Details'));
    console.log(chalk.dim('  ' + '─'.repeat(40)));
    console.log(`  ${chalk.dim('ID:')}           ${proj.id}`);
    console.log(`  ${chalk.dim('Name:')}         ${proj.name}`);
    console.log(`  ${chalk.dim('Slug:')}         ${proj.slug}`);
    console.log(`  ${chalk.dim('Description:')}  ${proj.description || chalk.dim('None')}`);
    console.log(`  ${chalk.dim('Services:')}     ${proj._count?.services ?? 0}`);
    console.log(`  ${chalk.dim('Environments:')} ${proj._count?.environments ?? 0}`);
    console.log(`  ${chalk.dim('Created:')}      ${proj.created_at ? new Date(proj.created_at).toLocaleString() : 'N/A'}`);

    if (proj.services && proj.services.length > 0) {
      console.log('');
      console.log(chalk.bold('  Services'));
      console.log(chalk.dim('  ' + '─'.repeat(40)));
      for (const svc of proj.services) {
        const statusColor = svc.status === 'running' ? chalk.green : svc.status === 'failed' ? chalk.red : chalk.yellow;
        console.log(`  ${chalk.dim('•')} ${svc.name} ${statusColor(`(${svc.status || 'unknown'})`)} ${chalk.dim(`[${svc.source_type}]`)}`);
      }
    }
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red('Failed to load project.'));
    p.log.error(err.message || 'Unknown error');
  }
}

/**
 * Create a new project in an organization
 */
export async function projectsCreateAction() {
  const orgId = await selectOrg();
  if (!orgId) return;

  const name = await p.text({
    message: 'Enter a name for your new Project:',
    placeholder: 'My Awesome Project',
    validate: (value) => {
      if (!value || !value.trim()) return 'Project name cannot be empty.';
      return;
    }
  });
  if (p.isCancel(name)) return;

  const s = p.spinner();
  s.start('Creating project...');
  try {
    const proj = await apiRequest<any>({
      method: 'POST',
      url: '/projects',
      data: { orgId, name: name as string }
    });
    s.stop(chalk.green('Project created successfully!'));
    console.log('');
    console.log(`  ${chalk.dim('ID:')}   ${proj.id}`);
    console.log(`  ${chalk.dim('Name:')} ${proj.name}`);
    console.log(`  ${chalk.dim('Slug:')} ${proj.slug}`);
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red('Failed to create project.'));
    p.log.error(err.message || 'Unknown error');
  }
}

/**
 * Rename / update a project
 */
export async function projectsUpdateAction() {
  const orgId = await selectOrg();
  if (!orgId) return;

  const projectId = await selectProject(orgId);
  if (!projectId) return;

  const field = await p.select({
    message: 'What would you like to update?',
    options: [
      { value: 'name', label: '✏️  Rename Project' },
      { value: 'description', label: '📝 Update Description' },
    ]
  });
  if (p.isCancel(field)) return;

  const newValue = await p.text({
    message: field === 'name' ? 'Enter the new project name:' : 'Enter the new description:',
    placeholder: field === 'name' ? 'New Project Name' : 'A brief description of this project',
    validate: (value) => {
      if (field === 'name' && (!value || !value.trim())) return 'Name cannot be empty.';
      return;
    }
  });
  if (p.isCancel(newValue)) return;

  const s = p.spinner();
  s.start('Updating project...');
  try {
    const data = field === 'name' ? { name: newValue as string } : { description: newValue as string };
    const proj = await apiRequest<any>({ method: 'PATCH', url: `/projects/${projectId}`, data });
    s.stop(chalk.green('Project updated successfully!'));
    console.log(`  ${chalk.dim('Name:')} ${proj.name}`);
    console.log(`  ${chalk.dim('Description:')} ${proj.description || chalk.dim('None')}`);
    console.log('');
  } catch (err: any) {
    s.stop(chalk.red('Failed to update project.'));
    p.log.error(err.message || 'Unknown error');
  }
}

/**
 * Delete a project
 */
export async function projectsDeleteAction() {
  const orgId = await selectOrg();
  if (!orgId) return;

  const projectId = await selectProject(orgId);
  if (!projectId) return;

  const confirm = await p.confirm({
    message: chalk.red('Are you sure you want to delete this project? This will also delete all services inside it.'),
    initialValue: false
  });
  if (p.isCancel(confirm) || !confirm) {
    p.log.info('Deletion cancelled.');
    return;
  }

  const s = p.spinner();
  s.start('Deleting project...');
  try {
    const result = await apiRequest<any>({ method: 'DELETE', url: `/projects/${projectId}` });
    s.stop(chalk.green(result.message || 'Project deleted successfully!'));
  } catch (err: any) {
    s.stop(chalk.red('Failed to delete project.'));
    p.log.error(err.message || 'Unknown error');
  }
}
