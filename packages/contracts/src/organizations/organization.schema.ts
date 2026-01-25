import { z } from 'zod';
import { paginatedResponseSchema, paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const organizationBaseSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .describe('Organization name'),
});

export const createOrganizationSchema = organizationBaseSchema;

export const updateOrganizationSchema = organizationBaseSchema.partial();

export const replaceOrganizationSchema = organizationBaseSchema;

export const organizationResponseSchema = organizationBaseSchema.extend({
  id: z.uuid().describe('Unique identifier of the organization'),
  ownerId: z.uuid().describe('User ID of the organization owner'),
  createdAt: z.iso.datetime().describe('Timestamp when the organization was created'),
  updatedAt: z.iso.datetime().describe('Timestamp when the organization was last updated'),
});

export const listOrganizationsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().describe('Filter organizations by name (partial match)'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt').describe('Field to sort results by'),
  order: sortOrderSchema,
});

export const paginatedOrganizationsResponseSchema = paginatedResponseSchema(organizationResponseSchema);
