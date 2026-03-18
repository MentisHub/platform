import { z } from 'zod';

export const trainingStatusSchema = z.enum([
  'PENDING',   // Training created, waiting for ServerApp deployment
  'DEPLOYING', // ServerApp container is being deployed
  'READY',     // ServerApp deployed successfully, waiting to start execution
  'RUNNING',   // Training is actively running
  'PAUSED',    // Training execution paused (reserved for future use)
  'COMPLETED', // Training finished successfully
  'FAILED',    // Training failed during execution
  'CANCELLED', // Training was manually cancelled
]).describe('Current execution status of the training run');

export const createTrainingSchema = z.object({
  fabId: z.uuid().describe('FAB UUID to use for this training run'),
  configuration: z.record(z.string(), z.any()).optional().describe('Optional per-run Flower configuration overrides'),
});

export const runTrainingSchema = z.object({});

export const linkNodeToTrainingSchema = z.object({
  nodesId: z.array(z.string()).describe('Array of node UUIDs to link to the training run'),
});

export const linkNodeToTrainingResponse = z.object({
  count: z.int().describe('Number of nodes successfully linked'),
});

export const updateTrainingSchema = z.object({
  status: z.enum(['PAUSED', 'CANCELLED']).describe('New status for the training run (only PAUSED or CANCELLED allowed)'),
});

export const startTrainingResponseSchema = z.object({
  trainingRunId: z.uuid().describe('Unique identifier of the created training run'),
  status: trainingStatusSchema,
});

export const trainingRunResponseSchema = z.object({
  id: z.uuid().describe('Unique identifier of the training run'),
  status: trainingStatusSchema,
  projectId: z.uuid().describe('Project UUID this training run belongs to'),
  configuration: z.record(z.string(), z.any()).nullable().describe('Flower run configuration (num-rounds, num-epochs, etc.)'),
  createdAt: z.iso.datetime().describe('Timestamp when the training run was created'),
  startedAt: z.iso.datetime().nullable().describe('Timestamp when the training execution started'),
  completedAt: z.iso.datetime().nullable().describe('Timestamp when the training execution completed'),
});
