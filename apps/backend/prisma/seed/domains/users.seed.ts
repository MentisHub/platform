import { faker } from '@faker-js/faker';
import { PrismaClient, User } from '@prisma/client';
import { seedAuthUsers } from '../auth.js';

export interface UserSeedData {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const DEFAULT_PASSWORD = 'password123';

export async function seedUsers(
  prisma: PrismaClient,
  count: number = 5,
): Promise<User[]> {
  console.log('Seeding users...');

  const usersData: UserSeedData[] = Array.from({ length: count }).map(
    (_, i) => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: `user${i + 1}@mentishub.dev`,
      password: DEFAULT_PASSWORD,
    }),
  );

  await seedAuthUsers(usersData);

  const users = await prisma.user.findMany({
    where: { id: { in: usersData.map((u) => u.id) } },
  });

  const onboardedCount = Math.ceil(count * 0.6);
  await Promise.all(
    users.slice(0, onboardedCount).map((user) =>
      prisma.user.update({
        where: { id: user.id },
        data: { isOnboardingComplete: true },
      }),
    ),
  );

  usersData.forEach((u, i) =>
    console.log(
      `  [USER]  ${u.email}  →  ${u.id}  (${i < onboardedCount ? 'onboarded' : 'pending'})`,
    ),
  );
  console.log(`  password: ${DEFAULT_PASSWORD}\n`);

  return users;
}
