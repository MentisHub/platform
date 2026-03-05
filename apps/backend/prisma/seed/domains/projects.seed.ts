import { faker } from '@faker-js/faker';
import {
  Fab,
  Organization,
  PrismaClient,
  Project,
  ProjectRole,
} from '@prisma/client';
import { createProjectFab, FixtureFAB } from './fabs.seed.js';
import { createNodesForProject } from './nodes.seed.js';
import { createRunsForProject } from './training.seed.js';

export async function createProjectForOrg(
  prisma: PrismaClient,
  organization: Organization,
  memberIds: string[],
  createdBy: string,
  fab: Fab | null,
  fixture: FixtureFAB | null,
  projectFabQuota: { remaining: number },
): Promise<Project> {
  const projectName = `${faker.word.adjective()}-${faker.word.noun()}`;

  const project = await prisma.project.create({
    data: {
      name: projectName,
      organizationId: organization.id,
      createdBy,
      trainingConfig: {
        num_rounds: faker.number.int({ min: 5, max: 20 }),
        fraction_fit: faker.number.float({
          min: 0.5,
          max: 1.0,
          fractionDigits: 2,
        }),
        fraction_evaluate: faker.number.float({
          min: 0.5,
          max: 1.0,
          fractionDigits: 2,
        }),
      },
    },
  });

  if (memberIds.length > 0) {
    const projectMemberCount = faker.number.int({
      min: 1,
      max: memberIds.length,
    });
    const selectedMembers = faker.helpers.arrayElements(
      memberIds,
      projectMemberCount,
    );

    await Promise.all(
      selectedMembers.map((userId, idx) =>
        prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId,
            role: idx === 0 ? ProjectRole.ADMIN : ProjectRole.MEMBER,
            invitedBy: organization.ownerId,
          },
        }),
      ),
    );
  }

  console.log(`  [PROJECT]  "${project.name}"  →  ${project.id}`);

  // Project-scoped FAB
  let projectFab: Fab | null = null;
  if (projectFabQuota.remaining > 0 && fixture) {
    projectFab = await createProjectFab(
      prisma,
      project,
      organization.id,
      organization.ownerId,
      fixture,
    );
    if (projectFab) {
      projectFabQuota.remaining--;
      console.log(
        `    [FAB:PROJECT]  ${projectFab.name}@${projectFab.version}  →  ${projectFab.id}`,
      );
    }
  }

  const effectiveFab = projectFab ?? fab;

  const nodeResult = await createNodesForProject(
    prisma,
    project.id,
    organization.id,
    createdBy,
  );

  await createRunsForProject(
    prisma,
    project,
    createdBy,
    nodeResult.readyNodes,
    nodeResult.createdNodes,
    nodeResult.createdNodePsks,
    effectiveFab,
  );

  return project;
}

export async function seedCrossOrgCollaborators(
  prisma: PrismaClient,
  allProjects: Project[],
  allOrgs: Organization[],
): Promise<void> {
  console.log('\nSeeding cross-org collaborators...');

  let collaboratorCount = 0;

  for (const project of allProjects) {
    const otherOrgs = allOrgs.filter((o) => o.id !== project.organizationId);

    if (otherOrgs.length === 0 || !faker.datatype.boolean(0.4)) continue;

    const count = faker.number.int({
      min: 1,
      max: Math.min(2, otherOrgs.length),
    });
    const selectedOrgs = faker.helpers.arrayElements(otherOrgs, count);

    for (const [idx, org] of selectedOrgs.entries()) {
      await prisma.projectCollaborator.create({
        data: {
          projectId: project.id,
          organizationId: org.id,
          invitedBy: allOrgs.find((o) => o.id === project.organizationId)!
            .ownerId,
          acceptedAt: idx === 0 ? faker.date.recent({ days: 14 }) : null,
        },
      });
      console.log(
        `  [COLLAB]  "${project.name}"  ←  org: ${org.id}  (${idx === 0 ? 'accepted' : 'pending'})`,
      );
      collaboratorCount++;
    }
  }

  console.log(`  ${collaboratorCount} cross-org collaborators\n`);
}
