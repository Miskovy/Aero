import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Setup pg adapter for Prisma since the client requires it
const rawConnectionString = `${process.env.DATABASE_URL || ''}`;
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

async function main() {
  console.log('Seeding the database...');

//   // --- Clear the database (optional) ---
//   await prisma.deployment.deleteMany();
//   await prisma.service.deleteMany();
//   await prisma.project.deleteMany();
//   await prisma.organizationMember.deleteMany();
//   await prisma.organization.deleteMany();
//   await prisma.user.deleteMany();

  // --- Create a User ---
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@aero.local',
      name: 'Test Setup User',
      password_hash: hashedPassword,
    },
  });
  console.log(`Created User: ${user.email}`);

  // --- Create an Organization ---
  const organization = await prisma.organization.create({
    data: {
      name: 'Aero Test Org',
      slug: 'aero-test-org',
      owner_id: user.id,
      plan: 'free',
      members: {
        create: {
          user_id: user.id,
          role: 'owner',
        },
      },
    },
  });
  console.log(`Created Organization: ${organization.name}`);

  // --- 3. Create a Project ---
  const project = await prisma.project.create({
    data: {
      organization_id: organization.id,
      name: 'My Demo Project',
      slug: 'my-demo-project',
      description: 'A test project for testing the Aero platform.',
    },
  });
  console.log(`Created Project: ${project.name}`);

  // --- 4. Create a Service ---
  const service = await prisma.service.create({
    data: {
      project_id: project.id,
      name: 'Example Web API',
      slug: 'example-web-api',
      type: 'application',
      source_type: 'git',
      dockerfile_path: './Dockerfile',
      git_branch: 'main',
    },
  });
  console.log(`Created Service: ${service.name}`);

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
