import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises';
import { apiRequest } from '../api/api.js';
import { watchDeploymentLogs } from './logs.js';

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

  const sourceType = await p.select({
    message: 'What is the source of your application?',
    options: [
      { value: 'GITHUB', label: 'GitHub Repository' },
      { value: 'DOCKER', label: 'Docker Image' }
    ]
  });
  if (p.isCancel(sourceType)) return p.outro(chalk.gray('Cancelled.'));

  let repo = '';
  let branch = '';
  let dockerImage = '';

  if (sourceType === 'GITHUB') {
    const r = await p.text({
      message: 'Enter the GitHub repository (e.g., miskovy/aero-cli):',
      placeholder: 'miskovy/my-repo'
    });
    if (p.isCancel(r) || !r) return p.outro(chalk.gray('Cancelled.'));
    repo = r as string;

    const b = await p.text({
      message: 'Which branch should we deploy?',
      placeholder: 'main',
      initialValue: 'main'
    });
    if (p.isCancel(b)) return p.outro(chalk.gray('Cancelled.'));
    branch = b as string;
  } else {
    const img = await p.text({
      message: 'Enter the Docker image (e.g., nginx:latest):',
      placeholder: 'nginx:latest'
    });
    if (p.isCancel(img) || !img) return p.outro(chalk.gray('Cancelled.'));
    dockerImage = img as string;
  }

  const internalPort = await p.text({
    message: 'What port does the application listen on internally?',
    placeholder: '3000',
    initialValue: '3000'
  });
  if (p.isCancel(internalPort)) return p.outro(chalk.gray('Cancelled.'));

  const domain = await p.text({
    message: 'Custom domain (leave empty for auto-generated aerodeploy.app subdomain):',
    placeholder: 'api.my-app.com',
    initialValue: ''
  });
  if (p.isCancel(domain)) return p.outro(chalk.gray('Cancelled.'));

  const envVarsRaw = await p.text({
    message: 'Environment variables (comma separated KEY=VALUE, leave empty to skip):',
    placeholder: 'NODE_ENV=production, API_KEY=secret',
    initialValue: ''
  });
  if (p.isCancel(envVarsRaw)) return p.outro(chalk.gray('Cancelled.'));

  let envVars: Record<string, string> = {};
  if (envVarsRaw) {
    (envVarsRaw as string).split(',').forEach(pair => {
      const [key, ...rest] = pair.split('=');
      if (key && rest.length > 0) {
        envVars[key.trim()] = rest.join('=').trim();
      }
    });
  }

  sFetch.start('Loading available nodes...');
  let nodes: any[] = [];
  try {
    nodes = await apiRequest<any[]>({ method: 'GET', url: `/nodes` });
  } catch (err: any) {
    // Ignore if nodes API is unavailable or failing
  }
  sFetch.stop('Nodes loaded!');

  let nodeId: string | symbol = '';
  const nodeOptions = [
    { value: '', label: '☁️ Cloud (Aero Platform)' }
  ];

  nodes.forEach(n => {
    nodeOptions.push({ value: n.id, label: `💻 Local Device: ${n.hostname || n.id} (${n.status})` });
  });

  if (nodeOptions.length > 1) {
    nodeId = await p.select({
      message: 'Where do you want to deploy this service?',
      options: nodeOptions
    });
    if (p.isCancel(nodeId)) return p.outro(chalk.gray('Cancelled.'));
  }

  let buildCmd = '';
  let startCmd = '';

  if (sourceType === 'GITHUB') {
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
    if (p.isCancel(framework)) return p.outro(chalk.gray('Cancelled.'));

    if (framework !== 'Dockerfile') {
      const bCmd = await p.text({
        message: 'Build command (leave empty to skip):',
        initialValue: framework === 'Next.js' ? 'npm run build' : 'npm install'
      });
      if (p.isCancel(bCmd)) return p.outro(chalk.gray('Cancelled.'));
      buildCmd = bCmd as string;

      const sCmd = await p.text({
        message: 'Start command:',
        initialValue: framework === 'Next.js' ? 'npm start' : 'node index.js'
      });
      if (p.isCancel(sCmd)) return p.outro(chalk.gray('Cancelled.'));
      startCmd = sCmd as string;
    }
  }

  const confirm = await p.confirm({
    message: `Ready to create and deploy this service to ${chalk.green(orgs.find(o => o.id === orgId)?.name)}?`,
    initialValue: true
  });
  if (p.isCancel(confirm) || !confirm) return p.outro('Aborted.');

  sFetch.start('Creating service and queueing deployment...');
  try {
    // Map CLI selection values to API SourceType enum values
    const apiSourceType = sourceType === 'GITHUB' ? 'git' : 'docker_image';

    const payload: any = {
      projectId,
      sourceType: apiSourceType,
      internalPort: parseInt(internalPort as string, 10)
    };
    if (sourceType === 'GITHUB') {
      payload.repo = repo;
      payload.branch = branch;
    } else {
      payload.dockerImage = dockerImage;
    }
    if (domain) payload.domain = domain as string;
    if (Object.keys(envVars).length > 0) payload.envVars = envVars;
    if (nodeId) payload.nodeId = nodeId as string;
    if (buildCmd) payload.buildCmd = buildCmd as string;
    if (startCmd) payload.startCmd = startCmd as string;

    const result = await apiRequest<any>({
      method: 'POST',
      url: `/services`,
      data: payload
    });
    sFetch.stop('Service created and deployment triggered!');

    // Auto-enter live log watcher for the new deployment
    // createService returns a Deployment object with id and service_id
    const deploymentId = result?.id;
    const resultServiceId = result?.service_id;

    if (deploymentId && resultServiceId) {
      p.log.info(chalk.dim('Entering live deployment watcher...'));
      await watchDeploymentLogs(resultServiceId, deploymentId);
      // Let user see the result before returning to menu
      const cont = await p.text({ message: chalk.dim('Press Enter to return to menu...') });
      if (p.isCancel(cont)) return;
    } else {
      p.outro(`✅ Service created! Run ${chalk.cyan('aero logs')} to track progress.`);
    }
  } catch (err: any) {
    sFetch.stop(chalk.red('Failed to create the service or queue deployment.'));
    p.log.error(err.message || 'Unknown error occurred.');
    p.outro(chalk.gray('Returning to menu...'));
  }
}
