import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { deleteAuthUsers } from './auth.js';
import { cleanUp } from './cleanup.js';
import { seedFABs } from './domains/fabs.seed.js';
import { seedNodes } from './domains/nodes.seed.js';
import { seedOrganizations } from './domains/organizations.seed.js';
import { seedProjects } from './domains/projects.seed.js';
import { seedTraining } from './domains/training.seed.js';
import { seedUsers } from './domains/users.seed.js';

// Use consistent seed for reproducible data
faker.seed(12345);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await cleanUp(prisma);
  await deleteAuthUsers();

  const users = await seedUsers(prisma, 5);
  const orgsWithMembers = await seedOrganizations(prisma, users);
  const projects = await seedProjects(prisma, orgsWithMembers);
  const fabs = await seedFABs(prisma, orgsWithMembers);
  const nodes = await seedNodes(prisma, orgsWithMembers, projects);
  await seedTraining(prisma, orgsWithMembers, projects, nodes, fabs);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
