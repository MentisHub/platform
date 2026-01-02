import { z } from 'zod';
import { paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const organizationBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .describe('Organization name'),
  // Slug will be auto-generated from name
});

export const createOrganizationSchema = organizationBaseSchema;

export const updateOrganizationSchema = organizationBaseSchema.partial();

export const replaceOrganizationSchema = organizationBaseSchema;

export const organizationResponseSchema = organizationBaseSchema.extend({
  id: z.uuid().describe('Unique organization ID'),
  ownerId: z.uuid().describe('Organization owner ID'),
  createdAt: z.iso.datetime().describe('Creation date'),
  updatedAt: z.iso.datetime().describe('Last update date'),
  deletedAt: z.iso.datetime().nullable().describe('Deletion date (soft delete)'),
});

export const listOrganizationsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().describe('Search by name or slug'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt').describe('Sort field'),
  order: sortOrderSchema,
});
