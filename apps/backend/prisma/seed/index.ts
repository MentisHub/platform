import crypto from 'crypto';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import {
  Node,
  NodeStatus,
  Organization,
  OrgRole,
  PrismaClient,
  Profile,
  Project,
  ServerAppStatus,
  TrainingStatus,
} from '../generated/prisma/client.js';
import { deleteAuthUsers, seedAuthUsers } from './auth.js';

faker.seed(12345);

function generatePskHash(): string {
  const psk = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(psk).digest('hex');
  return hash;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'password123';

async function cleanUp() {
  await prisma.serverAppCertificate.deleteMany();
  await prisma.nodeCertificate.deleteMany();
  await prisma.serverApp.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.roundParticipant.deleteMany();
  await prisma.round.deleteMany();
  await prisma.runParticipant.deleteMany();
  await prisma.trainingRun.deleteMany();
  await prisma.node.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationCA.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.profile.deleteMany();
}

async function main() {
  await cleanUp();
  await deleteAuthUsers();

  const usersData = Array.from({ length: 5 }).map(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: DEFAULT_PASSWORD,
  }));

  await seedAuthUsers(usersData);

  const profiles: Profile[] = await Promise.all(
    usersData.map((u) =>
      prisma.profile.create({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
        },
      }),
    ),
  );
  console.log(`Created ${profiles.length} profiles`);

  const organizations: Organization[] = await Promise.all(
    profiles.map((profile) => {
      const orgName = faker.company.name();
      return prisma.organization.create({
        data: {
          name: orgName,
          slug: faker.helpers.slugify(orgName).toLowerCase().slice(0, 100),
          ownerId: profile.id,
        },
      });
    }),
  );
  console.log(`Created ${organizations.length} organizations`);

  const orgMembers: { organizationId: string; userId: string }[] = [];
  for (const org of organizations) {
    const potentialMembers = profiles.filter((p) => p.id !== org.ownerId);
    const memberCount = faker.number.int({ min: 1, max: 3 });
    const selectedMembers = faker.helpers.arrayElements(
      potentialMembers,
      memberCount,
    );

    for (const member of selectedMembers) {
      const key = `${org.id}-${member.id}`;
      if (!orgMembers.some((m) => `${m.organizationId}-${m.userId}` === key)) {
        orgMembers.push({ organizationId: org.id, userId: member.id });
      }
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
  console.log(`Created ${orgMembers.length} organization members`);

  const projects: Project[] = await Promise.all(
    organizations.flatMap((org) => {
      const projectCount = faker.number.int({ min: 2, max: 3 });
      return Array.from({ length: projectCount }).map(() => {
        const projectName = `${faker.word.adjective()}-${faker.word.noun()}`;
        return prisma.project.create({
          data: {
            name: projectName,
            slug: faker.helpers
              .slugify(projectName)
              .toLowerCase()
              .slice(0, 100),
            organizationId: org.id,
          },
        });
      });
    }),
  );
  console.log(`Created ${projects.length} projects`);

  const projectCollaborators: { projectId: string; organizationId: string }[] =
    [];
  for (const project of projects) {
    const otherOrgs = organizations.filter(
      (o) => o.id !== project.organizationId,
    );
    const collaboratorCount = faker.number.int({ min: 1, max: 2 });
    const selectedOrgs = faker.helpers.arrayElements(
      otherOrgs,
      collaboratorCount,
    );

    for (const org of selectedOrgs) {
      projectCollaborators.push({
        projectId: project.id,
        organizationId: org.id,
      });
    }
  }

  await Promise.all(
    projectCollaborators.map((pc) =>
      prisma.projectCollaborator.create({
        data: {
          projectId: pc.projectId,
          organizationId: pc.organizationId,
          acceptedAt: faker.datatype.boolean() ? faker.date.recent() : null,
        },
      }),
    ),
  );
  console.log(`Created ${projectCollaborators.length} project collaborators`);

  const nodes: Node[] = await Promise.all(
    organizations.flatMap((org) => {
      const nodeCount = faker.number.int({ min: 3, max: 5 });
      const orgProjects = projects.filter((p) => p.organizationId === org.id);

      return Array.from({ length: nodeCount }).map(() =>
        prisma.node.create({
          data: {
            name: `node-${faker.string.alphanumeric(8)}`,
            pskHash: faker.datatype.boolean(0.7) ? generatePskHash() : null,
            status: faker.helpers.arrayElement(Object.values(NodeStatus)),
            metadata: {
              cpu: faker.number.int({ min: 2, max: 32 }),
              memory: `${faker.number.int({ min: 4, max: 128 })}GB`,
              gpu: faker.helpers.arrayElement([
                null,
                'NVIDIA RTX 3090',
                'NVIDIA A100',
                'NVIDIA V100',
              ]),
              region: faker.location.country(),
            },
            organizationId: org.id,
            projectId:
              orgProjects.length > 0 && faker.datatype.boolean(0.6)
                ? faker.helpers.arrayElement(orgProjects).id
                : null,
          },
        }),
      );
    }),
  );
  console.log(`Created ${nodes.length} nodes`);

  const trainingRuns = await Promise.all(
    projects.flatMap((project) => {
      const runCount = faker.number.int({ min: 1, max: 3 });
      return Array.from({ length: runCount }).map(() => {
        const status = faker.helpers.arrayElement(
          Object.values(TrainingStatus),
        );
        const startedAt =
          status !== TrainingStatus.PENDING
            ? faker.date.recent({ days: 14 })
            : null;
        const completedAt =
          status === TrainingStatus.COMPLETED ||
          status === TrainingStatus.CANCELLED ||
          status === TrainingStatus.FAILED
            ? faker.date.between({
                from: startedAt || new Date(),
                to: new Date(),
              })
            : null;

        return prisma.trainingRun.create({
          data: {
            status,
            projectId: project.id,
            startedAt,
            completedAt,
          },
        });
      });
    }),
  );
  console.log(`Created ${trainingRuns.length} training runs`);

  const runParticipants: { runId: string; nodeId: string }[] = [];
  for (const run of trainingRuns) {
    const project = projects.find((p) => p.id === run.projectId)!;
    const orgNodes = nodes.filter(
      (n) => n.organizationId === project.organizationId,
    );

    if (orgNodes.length > 0) {
      const participantCount = faker.number.int({
        min: 1,
        max: Math.min(orgNodes.length, 4),
      });
      const selectedNodes = faker.helpers.arrayElements(
        orgNodes,
        participantCount,
      );

      for (const node of selectedNodes) {
        runParticipants.push({ runId: run.id, nodeId: node.id });
      }
    }
  }

  await Promise.all(
    runParticipants.map((rp) =>
      prisma.runParticipant.create({
        data: {
          runId: rp.runId,
          nodeId: rp.nodeId,
          joinedAt: faker.date.recent({ days: 7 }),
        },
      }),
    ),
  );
  console.log(`Created ${runParticipants.length} run participants`);

  const startedRuns = trainingRuns.filter((r) => r.status !== 'PENDING');
  const rounds = await Promise.all(
    startedRuns.flatMap((run) => {
      const roundCount = faker.number.int({ min: 3, max: 10 });
      return Array.from({ length: roundCount }).map((_, index) =>
        prisma.round.create({
          data: {
            number: index + 1,
            runId: run.id,
            startedAt: faker.date.recent({ days: 7 }),
            completedAt:
              run.status === TrainingStatus.COMPLETED ||
              index < roundCount - 1 ||
              faker.datatype.boolean(0.8)
                ? faker.date.recent({ days: 3 })
                : null,
          },
        }),
      );
    }),
  );
  console.log(`Created ${rounds.length} rounds`);

  const roundParticipants: { roundId: string; nodeId: string }[] = [];
  for (const round of rounds) {
    const runParts = runParticipants.filter((rp) => rp.runId === round.runId);

    for (const rp of runParts) {
      roundParticipants.push({ roundId: round.id, nodeId: rp.nodeId });
    }
  }

  await Promise.all(
    roundParticipants.map((rp) => {
      const participated = faker.datatype.boolean(0.9);
      return prisma.roundParticipant.create({
        data: {
          roundId: rp.roundId,
          nodeId: rp.nodeId,
          participated,
          failureReason: !participated
            ? faker.helpers.arrayElement([
                'Connection timeout',
                'Node offline',
                'Out of memory',
                'Training error',
              ])
            : null,
        },
      });
    }),
  );
  console.log(`Created ${roundParticipants.length} round participants`);

  const serverApps = await Promise.all(
    startedRuns.map((run) => {
      const status =
        run.status === TrainingStatus.COMPLETED
          ? TrainingStatus.COMPLETED
          : run.status === TrainingStatus.FAILED
            ? TrainingStatus.FAILED
            : faker.helpers.arrayElement([
                ServerAppStatus.STARTING,
                ServerAppStatus.RUNNING,
                ServerAppStatus.AGGREGATING,
              ] as const);

      return prisma.serverApp.create({
        data: {
          status,
          trainingRunId: run.id,
          podName: `server-app-${faker.string.alphanumeric(8)}`,
          nodeHost: `k8s-node-${faker.number.int({ min: 1, max: 10 })}`,
          startedAt: run.startedAt || new Date(),
          completedAt: run.completedAt,
        },
      });
    }),
  );
  console.log(`Created ${serverApps.length} server apps`);

  const runsWithArtifacts = trainingRuns.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'RUNNING',
  );
  const artifacts = await Promise.all(
    runsWithArtifacts.flatMap((run) => {
      const project = projects.find((p) => p.id === run.projectId)!;
      const runRounds = rounds.filter((r) => r.runId === run.id);
      const artifactCount = faker.number.int({
        min: 1,
        max: runRounds.length + 1,
      });

      return Array.from({ length: artifactCount }).map((_, index) =>
        prisma.artifact.create({
          data: {
            bucketKey: `orgs/${project.organizationId}/projects/${project.id}/runs/${run.id}/model-${index + 1}.pt`,
            sizeBytes: BigInt(
              faker.number.int({ min: 10_000_000, max: 5_000_000_000 }),
            ),
            roundNumber: index + 1,
            runId: run.id,
          },
        }),
      );
    }),
  );
  console.log(`Created ${artifacts.length} artifacts`);

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
