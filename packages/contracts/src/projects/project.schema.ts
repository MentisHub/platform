import { z } from 'zod';
import { paginatedResponseSchema, paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const projectBaseSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .describe('Project name'),
  trainingConfig: z.record(z.string(), z.any()).nullable().optional().describe('Training configuration overrides for this project'),
});

export const createProjectSchema = projectBaseSchema;

export const updateProjectSchema = projectBaseSchema.partial();

export const projectResponseSchema = projectBaseSchema.extend({
  id: z.uuid().describe('Unique identifier of the project'),
  organizationId: z.uuid().describe('Organization UUID this project belongs to'),
  createdAt: z.iso.datetime().describe('Timestamp when the project was created'),
  updatedAt: z.iso.datetime().describe('Timestamp when the project was last updated'),
});

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().describe('Filter projects by name (partial match)'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt').describe('Field to sort results by'),
  order: sortOrderSchema,
});

export const paginatedProjectsResponseSchema =
  paginatedResponseSchema(projectResponseSchema);
