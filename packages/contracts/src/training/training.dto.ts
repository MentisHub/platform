import type { z } from 'zod';
import type {
  startTrainingResponseSchema,
  startTrainingSchema,
  trainingRunResponseSchema,
} from './training.schema';
import type { nodeStatusSchema } from '../nodes/node.schema';

export type StartTrainingInput = z.infer<typeof startTrainingSchema>;
export type StartTrainingResponse = z.infer<typeof startTrainingResponseSchema>;
export type TrainingRunResponse = z.infer<typeof trainingRunResponseSchema>;
export type NodeStatus = z.infer<typeof nodeStatusSchema>;
