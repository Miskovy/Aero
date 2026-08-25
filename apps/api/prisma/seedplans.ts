import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const rawConnectionString = process.env.DATABASE_URL || '';
const isCloudDb =
  rawConnectionString.includes('aivencloud.com') ||
  rawConnectionString.includes('neon.tech') ||
  rawConnectionString.includes('sslmode=');

const cleanConnectionString = rawConnectionString.split('?')[0];

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PLANS_DATA = [
  {
    name: 'FREE',
    price: 0,
    max_projects: 1,
    is_inf_proj: false,
    max_nodes: 1,
    is_inf_nodes: false,
    max_services: 3,
    is_inf_services: false,
    max_deployments: 50,
    is_inf_deployments: false,
    max_backups: 2,
    is_inf_backups: false,
    max_webhooks: 2,
    is_inf_webhooks: false,
    max_apikeys: 2,
    is_inf_apikeys: false,
    max_alerts: 5,
    is_inf_alerts: false,
    custom_domains: false,
    max_teams: 1,
    is_inf_teams: false,
    max_members: 3,
    is_inf_members: false,
    max_organizations: 1,
    is_inf_organizations: false,
    is_active: true,
  },
  {
    name: 'PRO',
    price: 29,
    max_projects: 10,
    is_inf_proj: false,
    max_nodes: 5,
    is_inf_nodes: false,
    max_services: 25,
    is_inf_services: false,
    max_deployments: 500,
    is_inf_deployments: false,
    max_backups: 20,
    is_inf_backups: false,
    max_webhooks: 10,
    is_inf_webhooks: false,
    max_apikeys: 10,
    is_inf_apikeys: false,
    max_alerts: 25,
    is_inf_alerts: false,
    custom_domains: true,
    max_teams: 5,
    is_inf_teams: false,
    max_members: 15,
    is_inf_members: false,
    max_organizations: 3,
    is_inf_organizations: false,
    is_active: true,
  },
  {
    name: 'MAX',
    price: 99,
    max_projects: null,
    is_inf_proj: true,
    max_nodes: null,
    is_inf_nodes: true,
    max_services: null,
    is_inf_services: true,
    max_deployments: null,
    is_inf_deployments: true,
    max_backups: null,
    is_inf_backups: true,
    max_webhooks: null,
    is_inf_webhooks: true,
    max_apikeys: null,
    is_inf_apikeys: true,
    max_alerts: null,
    is_inf_alerts: true,
    custom_domains: true,
    max_teams: null,
    is_inf_teams: true,
    max_members: null,
    is_inf_members: true,
    max_organizations: null,
    is_inf_organizations: true,
    is_active: true,
  },
];

async function seedPlans() {
  console.log('Seeding plans into the database...');
  try {
    for (const planData of PLANS_DATA) {
      const existingPlan = await prisma.plan.findFirst({
        where: { name: planData.name },
      });

      if (existingPlan) {
        const updated = await prisma.plan.update({
          where: { id: existingPlan.id },
          data: planData,
        });
        console.log(`Updated plan: ${updated.name} (ID: ${updated.id})`);
      } else {
        const created = await prisma.plan.create({
          data: planData,
        });
        console.log(`Created plan: ${created.name} (ID: ${created.id})`);
      }
    }
    console.log('Successfully seeded FREE, PRO, and MAX plans.');
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedPlans();