import { faker } from '@faker-js/faker';
import {
  Fab,
  Organization,
  OrgRole,
  PrismaClient,
  Project,
  User,
} from '@prisma/client';
import { createOrgFab, FixtureFAB } from './fabs.seed.js';
import { createProjectForOrg } from './projects.seed.js';

export interface OrganizationWithMembers {
  organization: Organization;
  memberIds: string[];
  projects: Project[];
}

export async function createOrgForUser(
  prisma: PrismaClient,
  owner: User,
  allUsers: User[],
  withMembers: boolean,
  defaultFab: Fab | null,
  fixture: FixtureFAB | null,
  orgFabQuota: { remaining: number },
  projectFabQuota: { remaining: number },
): Promise<OrganizationWithMembers> {
  const organization = await prisma.organization.create({
    data: { name: faker.company.name(), ownerId: owner.id },
  });

  const memberIds: string[] = [];

  if (withMembers) {
    const potentialMembers = allUsers.filter((u) => u.id !== owner.id);
    const memberCount = faker.number.int({
      min: 1,
      max: Math.min(3, potentialMembers.length),
    });
    const selectedMembers = faker.helpers.arrayElements(
      potentialMembers,
      memberCount,
    );

    await Promise.all(
      selectedMembers.map((member, memberIndex) =>
        prisma.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: member.id,
            role: memberIndex === 0 ? OrgRole.ADMIN : OrgRole.MEMBER,
            invitedBy: owner.id,
          },
        }),
      ),
    );

    memberIds.push(...selectedMembers.map((m) => m.id));
  }

  const memberInfo =
    memberIds.length > 0 ? `(${memberIds.length} members)` : '(owner only)';
  console.log(
    `\n[ORG]  "${organization.name}"  →  ${organization.id}  ${memberInfo}`,
  );

  // Org-scoped FAB
  let orgFab: Fab | null = null;
  if (orgFabQuota.remaining > 0 && fixture) {
    orgFab = await createOrgFab(prisma, organization, fixture);
    if (orgFab) {
      orgFabQuota.remaining--;
      console.log(
        `  [FAB:ORG]      ${orgFab.name}@${orgFab.version}  →  ${orgFab.id}`,
      );
    }
  }

  const projectCount = faker.number.int({ min: 2, max: 3 });
  const createdBy = faker.helpers.arrayElement([
    organization.ownerId,
    ...memberIds,
  ]);
  const fab = orgFab ?? defaultFab;
  const projects: Project[] = [];

  for (let p = 0; p < projectCount; p++) {
    const project = await createProjectForOrg(
      prisma,
      organization,
      memberIds,
      createdBy,
      fab,
      fixture,
      projectFabQuota,
    );
    projects.push(project);
  }

  return { organization, memberIds, projects };
}
