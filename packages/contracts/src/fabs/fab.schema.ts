import { z } from 'zod';
import { paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const fabBaseSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .describe('Human-readable name of the FAB'),
  publisherName: z
    .string()
    .min(1)
    .max(255)
    .describe('Publisher name or organization identifier'),
  description: z.string().optional().describe('Optional description of the FAB functionality'),
  fabHash: z
    .string()
    .min(1)
    .max(64)
    .describe('SHA-256 hash of the FAB file content'),
  version: z
    .string()
    .min(1)
    .max(25)
    .describe('Semantic version of the FAB'),
});

export const uploadFabSchema = z.object({
  description: z.string().optional().describe('Optional description of the FAB functionality'),
  projectId: z.uuid().optional().describe('Project UUID to associate this FAB with'),
  isPublic: z.boolean().optional().default(false).describe('Whether this FAB is publicly accessible to all organizations'),
});

export const uploadDefaultFabSchema = z.object({
  description: z.string().optional().describe('Optional description of the FAB functionality'),
  isPublic: z.boolean().optional().default(true).describe('Whether this default FAB is publicly accessible (defaults to true)'),
});

export const fabResponseSchema = fabBaseSchema.extend({
  id: z.uuid().describe('Unique identifier of the FAB'),
  storagePath: z.string().describe('Object storage path where the FAB file is stored'),
  storageBucket: z.string().describe('Object storage bucket name'),
  sizeBytes: z.string().describe('File size in bytes'),
  isDefault: z.boolean().describe('Whether this is a default FAB provided by the platform'),
  isPublic: z.boolean().describe('Whether this FAB is publicly accessible to all organizations'),
  organizationId: z.uuid().nullable().describe('Organization UUID this FAB belongs to (null for default FABs)'),
  projectId: z.uuid().nullable().describe('Project UUID this FAB is associated with'),
  createdAt: z.iso.datetime().describe('Timestamp when the FAB was uploaded'),
});

export const listFabsQuerySchema = paginationQuerySchema.extend({
  projectId: z.uuid().optional().describe('Filter FABs by project UUID'),
  search: z.string().optional().describe('Filter FABs by name (partial match)'),
  includeDefault: z.boolean().optional().default(true).describe('Include default platform FABs in results'),
  includePublic: z.boolean().optional().default(true).describe('Include public FABs from other organizations'),
  sortBy: z.enum(['name', 'createdAt', 'version']).default('createdAt').describe('Field to sort results by'),
  order: sortOrderSchema,
});
