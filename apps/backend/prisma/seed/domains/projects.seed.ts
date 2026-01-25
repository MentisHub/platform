import { faker } from '@faker-js/faker';
import { PrismaClient, Project } from '@prisma/client';
import { OrganizationWithMembers } from './organizations.seed.js';

export interface ProjectWithOrg {
  project: Project;
  organizationId: string;
}

export async function seedProjects(
  prisma: PrismaClient,
  orgsWithMembers: OrganizationWithMembers[],
): Promise<ProjectWithOrg[]> {
  const projects = await Promise.all(
    orgsWithMembers.flatMap(({ organization }) => {
      const projectCount = faker.number.int({ min: 2, max: 3 });
      return Array.from({ length: projectCount }).map(() => {
        const projectName = `${faker.word.adjective()}-${faker.word.noun()}`;
        return prisma.project.create({
          data: {
            name: projectName,
            organizationId: organization.id,
            trainingConfig: {
              num_rounds: faker.number.int({ min: 5, max: 20 }),
              fraction_fit: faker.number.float({ min: 0.5, max: 1.0 }),
              fraction_evaluate: faker.number.float({ min: 0.5, max: 1.0 }),
            },
          },
        });
      });
    }),
  );

  console.log(`  Created ${projects.length} projects`);

  const projectCollaborators: { projectId: string; organizationId: string }[] =
    [];
  const organizations = orgsWithMembers.map((o) => o.organization);

  for (const project of projects) {
    const otherOrgs = organizations.filter(
      (o) => o.id !== project.organizationId,
    );

    if (otherOrgs.length > 0 && faker.datatype.boolean(0.4)) {
      const collaboratorCount = faker.number.int({ min: 1, max: 2 });
      const selectedOrgs = faker.helpers.arrayElements(
        otherOrgs,
        Math.min(collaboratorCount, otherOrgs.length),
      );

      for (const org of selectedOrgs) {
        projectCollaborators.push({
          projectId: project.id,
          organizationId: org.id,
        });
      }
    }
  }

  await Promise.all(
    projectCollaborators.map((pc) =>
      prisma.projectCollaborator.create({
        data: {
          projectId: pc.projectId,
          organizationId: pc.organizationId,
          acceptedAt: faker.datatype.boolean(0.7) ? faker.date.recent() : null,
        },
      }),
    ),
  );

  console.log(`  Created ${projectCollaborators.length} project collaborators`);

  return projects.map((project) => ({
    project,
    organizationId: project.organizationId,
  }));
}
