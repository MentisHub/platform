export interface CreateProjectInput {
  organizationId: string;
  userId: string;
  name: string;
  trainingConfig?: Record<string, any> | null;
}
