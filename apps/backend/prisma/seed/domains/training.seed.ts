import { faker } from '@faker-js/faker';
import {
  Artifact,
  Fab,
  Node,
  NodeStatus,
  PrismaClient,
  Round,
  TrainingRun,
  TrainingStatus,
} from '@prisma/client';
import { OrganizationWithMembers } from './organizations.seed.js';
import { ProjectWithOrg } from './projects.seed.js';

export interface TrainingData {
  trainingRuns: TrainingRun[];
  runParticipants: { runId: string; nodeId: string }[];
  rounds: Round[];
  roundParticipants: { roundId: string; nodeId: string }[];
  artifacts: Artifact[];
}

export async function seedTraining(
  prisma: PrismaClient,
  orgsWithMembers: OrganizationWithMembers[],
  projects: ProjectWithOrg[],
  nodes: Node[],
  fabs: Fab[],
): Promise<TrainingData> {
  const trainingRuns = await Promise.all(
    projects.flatMap(({ project, organizationId }) => {
      const runCount = faker.number.int({ min: 1, max: 3 });
      const org = orgsWithMembers.find(
        (o) => o.organization.id === organizationId,
      )!;
      const allOrgUsers = [org.organization.ownerId, ...org.memberIds];
      const projectFabs = fabs.filter((f) => f.projectId === project.id);

      return Array.from({ length: runCount }).map(() => {
        const statusDistribution: TrainingStatus[] = [
          TrainingStatus.PENDING, // 20% waiting for deployment
          TrainingStatus.PENDING,
          TrainingStatus.READY, // 30% ready to start
          TrainingStatus.READY,
          TrainingStatus.READY,
          TrainingStatus.RUNNING, // 30% actively running
          TrainingStatus.RUNNING,
          TrainingStatus.RUNNING,
          TrainingStatus.FAILED, // 10% failed
          TrainingStatus.CANCELLED, // 10% cancelled
        ];

        const status = faker.helpers.arrayElement(statusDistribution);

        const createdAt = faker.date.recent({ days: 30 });
        let startedAt: Date | null = null;
        let completedAt: Date | null = null;

        if (
          status === TrainingStatus.RUNNING ||
          status === TrainingStatus.FAILED ||
          status === TrainingStatus.CANCELLED
        ) {
          startedAt = faker.date.between({
            from: createdAt,
            to: new Date(),
          });

          if (
            status === TrainingStatus.FAILED ||
            status === TrainingStatus.CANCELLED
          ) {
            completedAt = faker.date.between({
              from: startedAt,
              to: new Date(),
            });
          }
        }

        return prisma.trainingRun.create({
          data: {
            status,
            projectId: project.id,
            fabId:
              projectFabs.length > 0
                ? faker.helpers.arrayElement(projectFabs).id
                : null,
            flowerRunId:
              status === TrainingStatus.RUNNING
                ? String(faker.number.int({ min: 1, max: 10000 }))
                : null,
            createdAt,
            startedAt,
            completedAt,
            createdById: faker.helpers.arrayElement(allOrgUsers),
            configuration: {
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
      });
    }),
  );

  const statusCounts = trainingRuns.reduce(
    (acc, run) => {
      acc[run.status] = (acc[run.status] || 0) + 1;
      return acc;
    },
    {} as Record<TrainingStatus, number>,
  );

  console.log(`  Created ${trainingRuns.length} training runs:`);
  console.log(
    `  - PENDING: ${statusCounts.PENDING || 0}, READY: ${statusCounts.READY || 0}, RUNNING: ${statusCounts.RUNNING || 0}`,
  );
  console.log(
    `  - FAILED: ${statusCounts.FAILED || 0}, CANCELLED: ${statusCounts.CANCELLED || 0}`,
  );

  const runParticipants: { runId: string; nodeId: string }[] = [];

  for (const run of trainingRuns) {
    const project = projects.find((p) => p.project.id === run.projectId)!;

    const eligibleNodes = nodes.filter(
      (n) =>
        n.organizationId === project.organizationId &&
        (n.status === NodeStatus.READY || n.status === NodeStatus.ACTIVE) &&
        n.projectId === run.projectId,
    );

    if (eligibleNodes.length > 0) {
      const participantCount = faker.number.int({
        min: Math.min(2, eligibleNodes.length),
        max: Math.min(eligibleNodes.length, 5),
      });
      const selectedNodes = faker.helpers.arrayElements(
        eligibleNodes,
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

  console.log(`  Created ${runParticipants.length} run participants`);

  // Create rounds only for RUNNING, FAILED, or CANCELLED training runs
  const completedOrActiveRuns = trainingRuns.filter(
    (r) =>
      r.status === TrainingStatus.RUNNING ||
      r.status === TrainingStatus.FAILED ||
      r.status === TrainingStatus.CANCELLED,
  );

  const rounds = await Promise.all(
    completedOrActiveRuns.flatMap((run) => {
      const roundCount = faker.number.int({ min: 3, max: 10 });
      return Array.from({ length: roundCount }).map((_, index) => {
        const roundStartedAt = run.startedAt
          ? faker.date.between({
              from: run.startedAt,
              to: run.completedAt || new Date(),
            })
          : faker.date.recent({ days: 7 });

        const isCompleted =
          run.status !== TrainingStatus.RUNNING ||
          index < roundCount - 1 ||
          faker.datatype.boolean(0.8);

        return prisma.round.create({
          data: {
            number: index + 1,
            runId: run.id,
            startedAt: roundStartedAt,
            completedAt: isCompleted
              ? faker.date.between({
                  from: roundStartedAt,
                  to: run.completedAt || new Date(),
                })
              : null,
          },
        });
      });
    }),
  );

  console.log(`  Created ${rounds.length} rounds`);

  // Create round participants
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
                'Certificate expired',
                'Data loading failed',
              ])
            : null,
        },
      });
    }),
  );

  console.log(`  Created ${roundParticipants.length} round participants`);

  // Create artifacts for RUNNING, FAILED, or CANCELLED runs
  const runsWithArtifacts = trainingRuns.filter(
    (r) =>
      r.status === TrainingStatus.RUNNING ||
      r.status === TrainingStatus.FAILED ||
      r.status === TrainingStatus.CANCELLED,
  );

  const artifacts = await Promise.all(
    runsWithArtifacts.flatMap((run) => {
      const project = projects.find((p) => p.project.id === run.projectId)!;
      const runRounds = rounds.filter((r) => r.runId === run.id);
      const artifactCount = faker.number.int({
        min: 1,
        max: Math.min(runRounds.length, 5),
      });

      return Array.from({ length: artifactCount }).map((_, index) =>
        prisma.artifact.create({
          data: {
            bucketKey: `orgs/${project.organizationId}/projects/${project.project.id}/runs/${run.id}/model-round-${index + 1}.pt`,
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

  console.log(`  Created ${artifacts.length} artifacts`);

  return {
    trainingRuns,
    runParticipants,
    rounds,
    roundParticipants,
    artifacts,
  };
}
