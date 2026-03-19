export interface CreateTrainingRunInput {
  organizationId: string;
  projectId: string;
  userId: string;
  fabId: string;
  configuration?: Record<string, unknown>;
}

export interface DeployServerAppInput {
  organizationId: string;
  trainingRunId: string;
  userId: string;
}

export interface RunMetrics {
  flowerRunId: string;
  startedAt: Date | null;
  completedAt: Date | null;
}
