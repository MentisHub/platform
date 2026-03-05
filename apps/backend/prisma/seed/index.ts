import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { deleteAuthUsers } from './auth.js';
import { cleanUp } from './cleanup.js';
import { seedDefaultFabs } from './domains/fabs.seed.js';
import {
  createOrgForUser,
  OrganizationWithMembers,
} from './domains/organizations.seed.js';
import { seedCrossOrgCollaborators } from './domains/projects.seed.js';
import { seedUsers } from './domains/users.seed.js';

faker.seed(12345);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...\n');

  await cleanUp(prisma);
  await deleteAuthUsers();

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('Seeding users...');
  const users = await seedUsers(prisma, 5);

  // ── Default FABs ───────────────────────────────────────────────────────────
  console.log('\nSeeding default FABs...');
  const { fabs: defaultFabs, fixture } = await seedDefaultFabs(
    prisma,
    users[0].id,
  );

  // ── Orgs → Projects → Nodes → Runs ────────────────────────────────────────
  const allOrgs: OrganizationWithMembers[] = [];
  const orgFabQuota = { remaining: 2 };
  const projectFabQuota = { remaining: 2 };

  console.log('\nSeeding organizations...');
  for (const [idx, user] of users.entries()) {
    const org = await createOrgForUser(
      prisma,
      user,
      users,
      idx > 0,
      defaultFabs[0] ?? null,
      fixture,
      orgFabQuota,
      projectFabQuota,
    );
    allOrgs.push(org);
  }

  // ── Cross-org collaborators ────────────────────────────────────────────────
  await seedCrossOrgCollaborators(
    prisma,
    allOrgs.flatMap((o) => o.projects),
    allOrgs.map((o) => o.organization),
  );

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('  Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
