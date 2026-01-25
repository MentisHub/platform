import type { z } from 'zod';
import type {
  createTrainingSchema,
  runTrainingSchema,
  startTrainingResponseSchema,
  trainingRunResponseSchema,
} from './training.schema';
import type { nodeStatusSchema } from '../nodes/node.schema';

export type CreateTraining = z.infer<typeof createTrainingSchema>;
export type RunTraining = z.infer<typeof runTrainingSchema>;
export type StartTrainingResponse = z.infer<typeof startTrainingResponseSchema>;
export type TrainingRunResponse = z.infer<typeof trainingRunResponseSchema>;
export type NodeStatus = z.infer<typeof nodeStatusSchema>;
