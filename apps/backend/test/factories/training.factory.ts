import { faker } from '@faker-js/faker';
import type {
  TrainingRun,
  TrainingStatus,
  Round,
  RunParticipant,
  RoundParticipant,
  Artifact,
} from '@prisma/client';

export type TrainingRunFactoryInput = Partial<TrainingRun>;
export type RoundFactoryInput = Partial<Round>;
export type RunParticipantFactoryInput = Partial<RunParticipant>;
export type RoundParticipantFactoryInput = Partial<RoundParticipant>;
export type ArtifactFactoryInput = Partial<Artifact>;

/**
 * Factory for creating TrainingRun entities
 *
 * @example
 * // Create a training run with defaults
 * const run = TrainingRunFactory.build();
 *
 * // Create a running training
 * const run = TrainingRunFactory.buildRunning({ projectId: project.id });
 */
export const TrainingRunFactory = {
  /**
   * Build a single TrainingRun object (not persisted)
   */
  build(overrides: TrainingRunFactoryInput = {}): TrainingRun {
    const statuses: TrainingStatus[] = [
      'PENDING',
      'RUNNING',
      'PAUSED',
      'COMPLETED',
      'CANCELLED',
      'FAILED',
    ];
    const now = new Date();
    const status = overrides.status || faker.helpers.arrayElement(statuses);

    const startedAt =
      status !== 'PENDING'
        ? overrides.startedAt || faker.date.recent({ days: 14 })
        : null;

    const completedAt =
      status === 'COMPLETED' || status === 'CANCELLED' || status === 'FAILED'
        ? overrides.completedAt ||
          faker.date.between({ from: startedAt || now, to: now })
        : null;

    return {
      id: faker.string.uuid(),
      status,
      projectId: faker.string.uuid(),
      fabId: null,
      flowerRunId: null,
      serverAppId: null,
      configuration: null,
      createdAt: now,
      startedAt,
      completedAt,
      ...overrides,
    };
  },

  /**
   * Build multiple TrainingRun objects
   */
  buildMany(
    count: number,
    overrides: TrainingRunFactoryInput = {},
  ): TrainingRun[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a pending training run
   */
  buildPending(overrides: TrainingRunFactoryInput = {}): TrainingRun {
    return this.build({
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
      ...overrides,
    });
  },

  /**
   * Build a running training run
   */
  buildRunning(overrides: TrainingRunFactoryInput = {}): TrainingRun {
    return this.build({
      status: 'RUNNING',
      startedAt: faker.date.recent({ days: 1 }),
      completedAt: null,
      flowerRunId: String(faker.number.int({ min: 1000, max: 999999 })),
      ...overrides,
    });
  },

  /**
   * Build a completed training run
   */
  buildCompleted(overrides: TrainingRunFactoryInput = {}): TrainingRun {
    const startedAt = faker.date.recent({ days: 7 });
    return this.build({
      status: 'COMPLETED',
      startedAt,
      completedAt: faker.date.between({ from: startedAt, to: new Date() }),
      flowerRunId: String(faker.number.int({ min: 1000, max: 999999 })),
      ...overrides,
    });
  },

  /**
   * Build a failed training run
   */
  buildFailed(overrides: TrainingRunFactoryInput = {}): TrainingRun {
    const startedAt = faker.date.recent({ days: 7 });
    return this.build({
      status: 'FAILED',
      startedAt,
      completedAt: faker.date.between({ from: startedAt, to: new Date() }),
      ...overrides,
    });
  },

  /**
   * Build a training run with configuration
   */
  buildWithConfig(
    config: Record<string, any>,
    overrides: TrainingRunFactoryInput = {},
  ): TrainingRun {
    return this.build({
      configuration: config,
      ...overrides,
    });
  },
};

/**
 * Factory for creating Round entities
 */
export const RoundFactory = {
  /**
   * Build a single Round object
   */
  build(overrides: RoundFactoryInput = {}): Round {
    const now = new Date();

    return {
      id: faker.string.uuid(),
      number: faker.number.int({ min: 1, max: 100 }),
      runId: faker.string.uuid(),
      startedAt: now,
      completedAt: faker.datatype.boolean(0.8) ? new Date() : null,
      ...overrides,
    };
  },

  /**
   * Build multiple Round objects for a training run
   */
  buildMany(count: number, runId: string): Round[] {
    return Array.from({ length: count }, (_, index) =>
      this.build({ runId, number: index + 1 }),
    );
  },

  /**
   * Build a completed round
   */
  buildCompleted(overrides: RoundFactoryInput = {}): Round {
    const startedAt = faker.date.recent({ days: 1 });
    return this.build({
      startedAt,
      completedAt: new Date(),
      ...overrides,
    });
  },

  /**
   * Build an in-progress round
   */
  buildInProgress(overrides: RoundFactoryInput = {}): Round {
    return this.build({
      startedAt: new Date(),
      completedAt: null,
      ...overrides,
    });
  },
};

/**
 * Factory for creating RunParticipant entities
 */
export const RunParticipantFactory = {
  /**
   * Build a single RunParticipant object
   */
  build(overrides: RunParticipantFactoryInput = {}): RunParticipant {
    return {
      runId: faker.string.uuid(),
      nodeId: faker.string.alphanumeric(64),
      joinedAt: new Date(),
      endedAt: null,
      ...overrides,
    };
  },

  /**
   * Build multiple RunParticipant objects
   */
  buildMany(
    count: number,
    overrides: RunParticipantFactoryInput = {},
  ): RunParticipant[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build participants for a specific run with given node IDs
   */
  buildForRun(runId: string, nodeIds: string[]): RunParticipant[] {
    return nodeIds.map((nodeId) => this.build({ runId, nodeId }));
  },
};

/**
 * Factory for creating RoundParticipant entities
 */
export const RoundParticipantFactory = {
  /**
   * Build a single RoundParticipant object
   */
  build(overrides: RoundParticipantFactoryInput = {}): RoundParticipant {
    const participated = overrides.participated ?? faker.datatype.boolean(0.9);

    return {
      roundId: faker.string.uuid(),
      nodeId: faker.string.alphanumeric(64),
      participated,
      failureReason: participated
        ? null
        : faker.helpers.arrayElement([
            'Connection timeout',
            'Node offline',
            'Out of memory',
            'Training error',
          ]),
      ...overrides,
    };
  },

  /**
   * Build multiple RoundParticipant objects
   */
  buildMany(
    count: number,
    overrides: RoundParticipantFactoryInput = {},
  ): RoundParticipant[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a successful participant
   */
  buildSuccessful(
    overrides: RoundParticipantFactoryInput = {},
  ): RoundParticipant {
    return this.build({
      participated: true,
      failureReason: null,
      ...overrides,
    });
  },

  /**
   * Build a failed participant
   */
  buildFailed(
    reason: string,
    overrides: RoundParticipantFactoryInput = {},
  ): RoundParticipant {
    return this.build({
      participated: false,
      failureReason: reason,
      ...overrides,
    });
  },
};

/**
 * Factory for creating Artifact entities
 */
export const ArtifactFactory = {
  /**
   * Build a single Artifact object
   */
  build(overrides: ArtifactFactoryInput = {}): Artifact {
    const runId = overrides.runId || faker.string.uuid();
    const roundNumber =
      overrides.roundNumber || faker.number.int({ min: 1, max: 10 });

    return {
      id: faker.string.uuid(),
      bucketKey: `runs/${runId}/model-${roundNumber}.pt`,
      sizeBytes: BigInt(
        faker.number.int({ min: 10_000_000, max: 5_000_000_000 }),
      ),
      roundNumber,
      runId,
      createdAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Build multiple Artifact objects
   */
  buildMany(count: number, overrides: ArtifactFactoryInput = {}): Artifact[] {
    return Array.from({ length: count }, (_, index) =>
      this.build({ roundNumber: index + 1, ...overrides }),
    );
  },
};

/**
 * Build a complete training setup
 */
export const buildTrainingSetup = (
  options: {
    numRounds?: number;
    numParticipants?: number;
    status?: TrainingStatus;
  } = {},
) => {
  const { numRounds = 5, numParticipants = 3, status = 'RUNNING' } = options;

  // Import here to avoid circular dependencies

  const { buildProjectSetup } =
    require('./project.factory') as typeof import('./project.factory');

  const { NodeFactory } =
    require('./node.factory') as typeof import('./node.factory');

  const { owner, organization, ca, project } = buildProjectSetup();

  const nodes = NodeFactory.buildMany(numParticipants, {
    organizationId: organization.id,
    createdById: owner.id,
    status: 'ONLINE',
  });

  const trainingRun = TrainingRunFactory.build({
    projectId: project.id,
    status,
    ...(status !== 'PENDING' && {
      startedAt: faker.date.recent({ days: 1 }),
      flowerRunId: String(faker.number.int({ min: 1000, max: 999999 })),
    }),
  });

  const participants = RunParticipantFactory.buildForRun(
    trainingRun.id,
    nodes.map((n) => n.id),
  );

  const rounds = RoundFactory.buildMany(numRounds, trainingRun.id);

  return {
    owner,
    organization,
    ca,
    project,
    nodes,
    trainingRun,
    participants,
    rounds,
  };
};
