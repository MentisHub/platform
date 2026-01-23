import type { Fab, TrainingRun, Organization } from '@prisma/client';

export interface FabPackage {
  trainingRun: TrainingRun;
  fab: Fab & { organization?: Pick<Organization, 'name'> | null };
  content: Buffer;
}
