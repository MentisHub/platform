import { z } from 'zod';
import { paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const fabBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .describe('FAB name'),
  description: z.string().optional().describe('FAB description'),
  fabHash: z
    .string()
    .min(1, 'FAB hash is required')
    .max(64, 'FAB hash must be at most 64 characters')
    .describe('FAB hash (identifier)'),
  version: z
    .string()
    .min(1, 'Version is required')
    .max(50, 'Version must be at most 50 characters')
    .describe('FAB version'),
});

export const uploadFabSchema = fabBaseSchema.extend({
  projectId: z.uuid().optional().describe('Project ID (if project-specific)'),
  isPublic: z.boolean().optional().default(false).describe('Whether FAB is public'),
});

export const uploadDefaultFabSchema = fabBaseSchema.extend({
  isPublic: z.boolean().optional().default(true).describe('Whether FAB is public'),
});

export const fabResponseSchema = fabBaseSchema.extend({
  id: z.uuid().describe('Unique FAB ID'),
  storagePath: z.string().describe('Storage path in Supabase'),
  storageBucket: z.string().describe('Storage bucket name'),
  sizeBytes: z.string().describe('File size in bytes'),
  isDefault: z.boolean().describe('Whether this is a platform default FAB'),
  isPublic: z.boolean().describe('Whether this FAB is publicly accessible'),
  organizationId: z.uuid().nullable().describe('Organization ID (null for default FABs)'),
  projectId: z.uuid().nullable().describe('Project ID (null if org-level or default)'),
  createdAt: z.iso.datetime().describe('Creation date'),
});

export const listFabsQuerySchema = paginationQuerySchema.extend({
  projectId: z.uuid().optional().describe('Filter by project ID'),
  search: z.string().optional().describe('Search by name'),
  includeDefault: z.boolean().optional().default(true).describe('Include default FABs'),
  includePublic: z.boolean().optional().default(true).describe('Include public FABs'),
  sortBy: z.enum(['name', 'createdAt', 'version']).default('createdAt').describe('Sort field'),
  order: sortOrderSchema,
});
