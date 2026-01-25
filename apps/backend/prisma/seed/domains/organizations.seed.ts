import { faker } from '@faker-js/faker';
import { Organization, OrgRole, PrismaClient, User } from '@prisma/client';

export interface OrganizationWithMembers {
  organization: Organization;
  memberIds: string[];
}

export async function seedOrganizations(
  prisma: PrismaClient,
  users: User[],
): Promise<OrganizationWithMembers[]> {
  const organizations = await Promise.all(
    users.map((user) =>
      prisma.organization.create({
        data: {
          name: faker.company.name(),
          ownerId: user.id,
        },
      }),
    ),
  );

  console.log(`  Created ${organizations.length} organizations`);

  const orgMembers: { organizationId: string; userId: string }[] = [];

  for (const org of organizations) {
    const potentialMembers = users.filter((u) => u.id !== org.ownerId);
    const memberCount = faker.number.int({ min: 1, max: 3 });
    const selectedMembers = faker.helpers.arrayElements(
      potentialMembers,
      Math.min(memberCount, potentialMembers.length),
    );

    for (const member of selectedMembers) {
      orgMembers.push({ organizationId: org.id, userId: member.id });
    }
  }

  await Promise.all(
    orgMembers.map((m) =>
      prisma.organizationMember.create({
        data: {
          organizationId: m.organizationId,
          userId: m.userId,
          role: faker.helpers.arrayElement(Object.values(OrgRole)),
        },
      }),
    ),
  );

  console.log(`  Created ${orgMembers.length} organization members`);

  return organizations.map((org) => ({
    organization: org,
    memberIds: orgMembers
      .filter((m) => m.organizationId === org.id)
      .map((m) => m.userId),
  }));
}
