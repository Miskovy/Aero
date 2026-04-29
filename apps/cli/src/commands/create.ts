import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest } from '../api/api.js';

export async function createAction() {
  p.intro(chalk.bgGreen.black(' CREATE SERVICE '));
  
  const sFetch = p.spinner();
  
  sFetch.start('Loading your organizations...');
  let orgs: any[] = [];
  try {
    orgs = await apiRequest<any[]>({ method: 'GET', url: '/organizations' });
  } catch (err: any) {
    sFetch.stop('Failed to load organizations.');
    p.log.error(err.message || 'An error occurred');
    return;
  }
  sFetch.stop('Organizations loaded!');

  let orgId: string | symbol = '';

  if (!orgs || orgs.length === 0) {
    p.log.info("You don't have any Organizations yet.");
    const createOrg = await p.confirm({
      message: 'Would you like to create a new Organization now?',
      initialValue: true
    });
    if (p.isCancel(createOrg) || !createOrg) return p.outro(chalk.yellow('Returning to menu...'));

    const orgName = await p.text({
      message: 'Enter a name for your Organization:',
      placeholder: 'My Workspace'
    });
    if (p.isCancel(orgName) || !orgName) return p.outro(chalk.gray('Cancelled.'));

    sFetch.start('Creating organization...');
    try {
      const newOrg = await apiRequest<any>({ method: 'POST', url: '/organizations', data: { name: orgName } });
      orgs = [newOrg];
      orgId = newOrg.id;
      sFetch.stop('Organization created successfully!');
    } catch (e: any) {
      sFetch.stop(chalk.red('Failed to create organization.'));
      p.log.error(e.message || 'Unknown error');
      return p.outro(chalk.gray('Returning...'));
    }
  } else {
    orgId = await p.select({
      message: 'Select an Organization:',
      options: [
        ...orgs.map(o => ({ value: o.id, label: o.name })),
        { value: 'cancel', label: '❌ Cancel' }
      ]
    });
  }

  if (p.isCancel(orgId) || orgId === 'cancel') return p.outro(chalk.gray('Cancelled.'));

  sFetch.start('Loading projects...');
  let projects: any[] = [];
  try {
    projects = await apiRequest<any[]>({ method: 'GET', url: `/projects?orgId=${String(orgId)}` });
  } catch (err: any) {
    sFetch.stop('Failed to load projects.');
    p.log.error(err.message || 'An error occurred');
    return;
  }
  sFetch.stop('Projects loaded!');

  let projectId: string | symbol = '';

  if (!projects || projects.length === 0) {
    p.log.info("You don't have any projects in this organization.");
    const createProj = await p.confirm({
      message: 'Would you like to create a new Project now?',
      initialValue: true
    });
    if (p.isCancel(createProj) || !createProj) return p.outro(chalk.yellow('Returning to menu...'));

    const projName = await p.text({
      message: 'Enter a name for your Project:',
      placeholder: 'Next.js App'
    });
    if (p.isCancel(projName) || !projName) return p.outro(chalk.gray('Cancelled.'));

    sFetch.start('Creating project...');
    try {
      const newProj = await apiRequest<any>({ method: 'POST', url: '/projects', data: { orgId: String(orgId), name: projName } });
      projects = [newProj];
      projectId = newProj.id;
      sFetch.stop('Project created successfully!');
    } catch (e: any) {
      sFetch.stop(chalk.red('Failed to create project.'));
      p.log.error(e.message || 'Unknown error');
      return p.outro(chalk.gray('Returning...'));
    }
  } else {
    projectId = await p.select({
      message: 'Select a Project:',
      options: [
        ...projects.map(p => ({ value: p.id, label: p.name || p.slug })),
        { value: 'cancel', label: '❌ Cancel' }
      ]
    });
  }

  if (p.isCancel(projectId) || projectId === 'cancel') return p.outro(chalk.gray('Cancelled.'));

  const repo = await p.text({
    message: 'Enter the GitHub repository you want to deploy (e.g., miskovy/aero-cli):',
    placeholder: 'miskovy/my-repo'
  });
  if (p.isCancel(repo) || !repo) return p.outro(chalk.gray('Cancelled.'));

  const branch = await p.text({
    message: 'Which branch should we deploy?',
    placeholder: 'main',
    initialValue: 'main'
  });
  if (p.isCancel(branch)) return;

  p.note('Let us configure the environment for deployment.', 'Configuration');
  
  const framework = await p.select({
    message: 'What framework are you using?',
    options: [
      { value: 'Next.js', label: 'Next.js' },
      { value: 'Node.js', label: 'Node.js / Express' },
      { value: 'React', label: 'React (Create React App)' },
      { value: 'Dockerfile', label: 'Custom Dockerfile' },
      { value: 'Other', label: 'Other/Static Web' }
    ]
  });
  if (p.isCancel(framework)) return;

  const buildCmd = await p.text({
    message: 'Build command (leave empty to skip):',
    initialValue: framework === 'Next.js' ? 'npm run build' : 'npm install'
  });
  if (p.isCancel(buildCmd)) return;

  const startCmd = await p.text({
    message: 'Start command:',
    initialValue: framework === 'Next.js' ? 'npm start' : 'node index.js'
  });
  if (p.isCancel(startCmd)) return;

  const confirm = await p.confirm({
    message: `Ready to create and deploy ${chalk.cyan(repo as string)} to ${chalk.green(orgs.find(o=>o.id === orgId)?.name)}?`,
    initialValue: true
  });
  if (p.isCancel(confirm) || !confirm) return p.outro('Aborted.');

  sFetch.start('Creating service and queueing deployment...');
  try {
    const result = await apiRequest({
      method: 'POST',
      url: `/services`,
      data: {
        projectId,
        repo,
        branch,
        framework,
        buildCmd,
        startCmd
      }
    });
    sFetch.stop('Service created and deployment triggered!');
    p.outro(`✅ You can now run ${chalk.cyan('aero logs')} to track its progress.`);
  } catch (err: any) {
    sFetch.stop(chalk.red('Failed to create the service or queue deployment.'));
    p.log.error(err.message || 'Unknown error occurred.');
    p.outro(chalk.gray('Returning to menu...'));
  }
}
