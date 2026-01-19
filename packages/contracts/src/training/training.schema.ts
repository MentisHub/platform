import { z } from 'zod';

export const trainingStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
]);

export const startTrainingSchema = z.object({
  projectId: z.uuid().describe('Project ID to run the training'),
  configurationId: z.string().optional().describe('Training configuration template ID'),
  fabId: z.string().describe('Flower Application Bundle ID'),
  fabVersion: z.string().describe('FAB version'),
  federation: z.string().optional().describe('Federation name').default('default'),
  overrideConfig: z.record(z.string(), z.any()).optional().describe('Override configuration parameters'),
});

export const startTrainingResponseSchema = z.object({
  trainingRunId: z.uuid().describe('Training run ID'),
  status: trainingStatusSchema.describe('Training status'),
});

export const trainingRunResponseSchema = z.object({
  id: z.uuid().describe('Training run ID'),
  status: trainingStatusSchema.describe('Training status'),
  projectId: z.uuid().describe('Project ID'),
  createdAt: z.iso.datetime().describe('Creation date'),
  startedAt: z.iso.datetime().nullable().describe('Start date'),
  completedAt: z.iso.datetime().nullable().describe('Completion date'),
});
