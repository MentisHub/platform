import { faker } from '@faker-js/faker';
import {
  Fab,
  Node,
  Prisma,
  PrismaClient,
  Project,
  Round,
  RoundStatus,
  TrainingRun,
  TrainingStatus,
} from '@prisma/client';

async function createRoundsForRun(
  prisma: PrismaClient,
  run: TrainingRun,
  projectNodes: Node[],
  roundCount: number,
  isTerminated: boolean,
): Promise<Round[]> {
  const rounds: Round[] = [];

  for (let i = 0; i < roundCount; i++) {
    const isLastRound = i === roundCount - 1;
    const roundCompleted = isTerminated || !isLastRound;

    const roundStartedAt = faker.date.between({
      from: run.startedAt ?? run.createdAt,
      to: run.completedAt ?? new Date(),
    });

    const roundCompletedAt = roundCompleted
      ? faker.date.between({
          from: roundStartedAt,
          to: run.completedAt ?? new Date(),
        })
      : null;

    const successfulParticipants =
      roundCompleted && projectNodes.length > 0
        ? faker.number.int({ min: 1, max: projectNodes.length })
        : null;

    const round = await prisma.round.create({
      data: {
        number: i + 1,
        runId: run.id,
        status: roundCompleted ? RoundStatus.COMPLETED : RoundStatus.FITTING,
        startedAt: roundStartedAt,
        completedAt: roundCompletedAt,
        totalParticipants: roundCompleted ? projectNodes.length : null,
        successfulParticipants,
        metrics: roundCompleted
          ? {
              loss: faker.number.float({
                min: 0.1,
                max: 2.0,
                fractionDigits: 4,
              }),
              accuracy: faker.number.float({
                min: 0.5,
                max: 0.99,
                fractionDigits: 4,
              }),
              num_examples: faker.number.int({ min: 100, max: 10000 }),
            }
          : Prisma.DbNull,
      },
    });

    rounds.push(round);

    if (roundCompleted && projectNodes.length > 0) {
      const participantCount = faker.number.int({
        min: 1,
        max: projectNodes.length,
      });
      const selectedNodes = faker.helpers.arrayElements(
        projectNodes,
        participantCount,
      );

      await Promise.all(
        selectedNodes.map((node, idx) => {
          const failed = idx >= (successfulParticipants ?? participantCount);
          return prisma.roundParticipant.create({
            data: {
              roundId: round.id,
              nodeId: node.id,
              startedAt: roundStartedAt,
              completedAt: failed ? null : roundCompletedAt,
              failureReason: failed
                ? faker.helpers.arrayElement([
                    'Connection timeout',
                    'Out of memory',
                    'Gradient explosion',
                    'Dataset loading failed',
                  ])
                : null,
              metrics: failed
                ? Prisma.DbNull
                : {
                    train_loss: faker.number.float({
                      min: 0.1,
                      max: 2.0,
                      fractionDigits: 4,
                    }),
                    train_accuracy: faker.number.float({
                      min: 0.5,
                      max: 0.99,
                      fractionDigits: 4,
                    }),
                    num_examples: faker.number.int({ min: 100, max: 5000 }),
                  },
            },
          });
        }),
      );
    }
  }

  return rounds;
}

const DEFAULT_CONFIG = {
  'num-rounds': 10,
  'fraction-fit': 1.0,
  'fraction-evaluate': 1.0,
  'min-fit-clients': 3,
  'min-evaluate-clients': 3,
  'min-available-clients': 3,
  'num-epochs': 1,
  'batch-size': 32,
  'num-clients': 3,
  'corrupt-partition-id': 2,
};

export async function createRunsForProject(
  prisma: PrismaClient,
  project: Project,
  createdBy: string,
  readyNodes: Node[],
  createdNodes: Node[],
  createdNodePsks: Record<string, string>,
  fab: Fab | null,
): Promise<{ runs: TrainingRun[]; rounds: Round[] }> {
  const runs: TrainingRun[] = [];
  const rounds: Round[] = [];

  // PENDING
  {
    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.PENDING,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
        configuration: DEFAULT_CONFIG,
      },
    });
    runs.push(run);
    console.log(`    [RUN:PENDING]    ${run.id}`);
    createdNodes.forEach((n) =>
      console.log(
        `      [NODE:CREATED]  ${n.id}  psk: ${createdNodePsks[n.id]}`,
      ),
    );
  }

  // DEPLOYING
  {
    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.DEPLOYING,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
      },
    });
    runs.push(run);
    console.log(`    [RUN:DEPLOYING]  ${run.id}`);
  }

  // READY
  {
    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.READY,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
        configuration: {
          ...DEFAULT_CONFIG,
          'num-rounds': 5,
          'fraction-fit': 1.0,
          'fraction-evaluate': 1.0,
        },
      },
    });
    runs.push(run);
    console.log(`    [RUN:READY]      ${run.id}`);
  }

  // RUNNING (only if there are ready nodes)
  if (readyNodes.length > 0) {
    const createdAt = faker.date.recent({ days: 7 });
    const startedAt = faker.date.between({ from: createdAt, to: new Date() });

    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.RUNNING,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
        flowerRunId: faker.string.uuid(),
        createdAt,
        startedAt,
        configuration: DEFAULT_CONFIG,
      },
    });

    const runRounds = await createRoundsForRun(
      prisma,
      run,
      readyNodes,
      5,
      false,
    );
    runs.push(run);
    rounds.push(...runRounds);
    console.log(
      `    [RUN:RUNNING]    ${run.id}  rounds: ${runRounds.length}  nodes: ${readyNodes.length}`,
    );
  }

  // COMPLETED
  {
    const createdAt = faker.date.recent({ days: 30 });
    const startedAt = faker.date.between({ from: createdAt, to: new Date() });
    const completedAt = faker.date.between({ from: startedAt, to: new Date() });

    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.COMPLETED,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
        flowerRunId: faker.string.uuid(),
        createdAt,
        startedAt,
        completedAt,
        metrics: {
          final_loss: faker.number.float({
            min: 0.05,
            max: 0.5,
            fractionDigits: 4,
          }),
          final_accuracy: faker.number.float({
            min: 0.8,
            max: 0.99,
            fractionDigits: 4,
          }),
          total_rounds: 10,
        },
        configuration: DEFAULT_CONFIG,
      },
    });

    const runRounds = await createRoundsForRun(
      prisma,
      run,
      readyNodes,
      10,
      true,
    );
    runs.push(run);
    rounds.push(...runRounds);
    console.log(`    [RUN:COMPLETED]  ${run.id}  rounds: ${runRounds.length}`);
  }

  // FAILED
  {
    const createdAt = faker.date.recent({ days: 14 });
    const startedAt = faker.date.between({ from: createdAt, to: new Date() });
    const completedAt = faker.date.between({ from: startedAt, to: new Date() });

    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.FAILED,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
        flowerRunId: faker.string.uuid(),
        createdAt,
        startedAt,
        completedAt,
      },
    });

    const failedRoundCount = faker.number.int({ min: 1, max: 4 });
    const runRounds = await createRoundsForRun(
      prisma,
      run,
      readyNodes,
      failedRoundCount,
      true,
    );
    runs.push(run);
    rounds.push(...runRounds);
    console.log(`    [RUN:FAILED]     ${run.id}  rounds: ${runRounds.length}`);
  }

  // CANCELLED
  {
    const createdAt = faker.date.recent({ days: 20 });
    const startedAt = faker.date.between({ from: createdAt, to: new Date() });
    const completedAt = faker.date.between({ from: startedAt, to: new Date() });

    const run = await prisma.trainingRun.create({
      data: {
        status: TrainingStatus.CANCELLED,
        projectId: project.id,
        fabId: fab?.id ?? null,
        createdBy,
        createdAt,
        startedAt,
        completedAt,
      },
    });
    runs.push(run);
    console.log(`    [RUN:CANCELLED]  ${run.id}`);
  }

  return { runs, rounds };
}
