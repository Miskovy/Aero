import chalk from 'chalk';
import icons from '../utils/icons.js';
import { apiRequest, requireAuth, unwrapData } from '../api/api.js';

export async function domainsListAction(serviceId: string) {
  if (!requireAuth()) return;

  if (!serviceId) {
    console.error(chalk.red(`${icons.error} Service ID is required.`));
    process.exit(1);
  }

  try {
    const raw = await apiRequest<any>({ method: 'GET', url: `/services/${serviceId}/domains` });
    const domains = unwrapData(raw);
    console.log(chalk.bold.blue(`\nDomains for service ${serviceId}`));
    console.log(chalk.gray(`${icons.separator.repeat(40)}`));
    
    if (!domains || domains.length === 0) {
      console.log(chalk.yellow('No domains found.'));
      return;
    }

    domains.forEach((d: any) => {
      console.log(`- ${chalk.bold(d.domain)} [${d.type}] (SSL: ${d.ssl_enabled}) - ID: ${d.id}`);
    });
  } catch (error: any) {
    console.error(chalk.red(`${icons.error} Failed to list domains:`), error.message);
  }
}

export async function domainsAddAction(serviceId: string, domain: string) {
  if (!requireAuth()) return;

  if (!serviceId || !domain) {
    console.error(chalk.red(`${icons.error} Service ID and domain are required.`));
    process.exit(1);
  }

  try {
    await apiRequest({
      method: 'POST',
      url: `/services/${serviceId}/domains`,
      data: { domainName: domain }
    });
    console.log(chalk.green(`${icons.success} Domain ${domain} added to service ${serviceId}`));
  } catch (error: any) {
    console.error(chalk.red(`${icons.error} Failed to add domain:`), error.message);
  }
}

export async function domainsRemoveAction(serviceId: string, domainId: string) {
  if (!requireAuth()) return;

  if (!serviceId || !domainId) {
    console.error(chalk.red(`${icons.error} Service ID and domain ID are required.`));
    process.exit(1);
  }

  try {
    await apiRequest({
      method: 'DELETE',
      url: `/services/${serviceId}/domains/${domainId}`
    });
    console.log(chalk.green(`${icons.success} Domain removed`));
  } catch (error: any) {
    console.error(chalk.red(`${icons.error} Failed to remove domain:`), error.message);
  }
}
