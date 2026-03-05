export interface CreateTrainingRunInput {
  organizationId: string;
  projectId: string;
  userId: string;
  fabId: string;
}

export interface DeployServerAppInput {
  organizationId: string;
  trainingRunId: string;
  userId: string;
}
