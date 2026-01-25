import { faker } from '@faker-js/faker';
import { Node, NodeStatus, PrismaClient } from '@prisma/client';
import { generatePSKWithHash } from '../../../src/utils/index.js';
import { OrganizationWithMembers } from './organizations.seed.js';
import { ProjectWithOrg } from './projects.seed.js';

export async function seedNodes(
  prisma: PrismaClient,
  orgsWithMembers: OrganizationWithMembers[],
  projects: ProjectWithOrg[],
): Promise<Node[]> {
  const nodes = await Promise.all(
    orgsWithMembers.flatMap(({ organization, memberIds }) => {
      const nodeCount = faker.number.int({ min: 3, max: 6 });
      const orgProjects = projects.filter(
        (p) => p.organizationId === organization.id,
      );
      const allOrgUsers = [organization.ownerId, ...memberIds];

      return Array.from({ length: nodeCount }).map(() => {
        // Realistic status distribution
        const statusDistribution: NodeStatus[] = [
          NodeStatus.READY, // 50% ready to use
          NodeStatus.READY,
          NodeStatus.READY,
          NodeStatus.READY,
          NodeStatus.READY,
          NodeStatus.ACTIVE, // 20% actively training
          NodeStatus.ACTIVE,
          NodeStatus.CREATED, // 10% just created
          NodeStatus.OFFLINE, // 10% offline
          NodeStatus.ERROR, // 10% with errors
        ];

        const status = faker.helpers.arrayElement(statusDistribution);

        return prisma.node.create({
          data: {
            name: `node-${faker.string.alphanumeric(8)}`,
            id: generatePSKWithHash().hash,
            status,
            metadata: {
              cpu: faker.number.int({ min: 2, max: 32 }),
              memory: `${faker.number.int({ min: 4, max: 128 })}GB`,
              gpu: faker.helpers.arrayElement([
                null,
                'NVIDIA RTX 3090',
                'NVIDIA RTX 4090',
                'NVIDIA A100',
                'NVIDIA V100',
                'AMD MI250',
              ]),
              region: faker.location.country(),
              os: faker.helpers.arrayElement([
                'Ubuntu 22.04',
                'Ubuntu 20.04',
                'Debian 11',
                'CentOS 8',
              ]),
            },
            organizationId: organization.id,
            // Only assign to project if node is READY or ACTIVE
            projectId:
              orgProjects.length > 0 &&
              (status === NodeStatus.READY || status === NodeStatus.ACTIVE) &&
              faker.datatype.boolean(0.7)
                ? faker.helpers.arrayElement(orgProjects).project.id
                : null,
            createdById: faker.helpers.arrayElement(allOrgUsers),
          },
        });
      });
    }),
  );

  const statusCounts = nodes.reduce(
    (acc, node) => {
      acc[node.status] = (acc[node.status] || 0) + 1;
      return acc;
    },
    {} as Record<NodeStatus, number>,
  );

  console.log(`  Created ${nodes.length} nodes:`);
  console.log(
    `  - CREATED: ${statusCounts.CREATED || 0}, READY: ${statusCounts.READY || 0}, ACTIVE: ${statusCounts.ACTIVE || 0}`,
  );
  console.log(
    `  - ERROR: ${statusCounts.ERROR || 0}, OFFLINE: ${statusCounts.OFFLINE || 0}`,
  );

  return nodes;
}
