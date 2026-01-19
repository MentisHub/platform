import { z } from 'zod';
import { paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const nodeStatusSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'INACTIVE',
]);



export const nodeBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .describe('Node name')
    .optional(),
  metadata: z.record(z.string(), z.any()).optional().describe('Node metadata'),
  projectId: z.uuid().optional().nullable().describe('Project ID to associate the node with'),
});

export const createNodeSchema = nodeBaseSchema;

export const updateNodeSchema = nodeBaseSchema.partial();

export const nodeResponseSchema = z.object({
  id: z.string().describe('Unique node ID'),
  name: z.string().describe('Node name'),
  status: nodeStatusSchema.describe('Node status'),
  metadata: z.record(z.string(), z.any()).nullable().describe('Node metadata'),
  createdAt: z.iso.datetime().describe('Creation date'),
  updatedAt: z.iso.datetime().describe('Last update date'),
  deletedAt: z.iso.datetime().nullable().describe('Deletion date (soft delete)'),
  organizationId: z.uuid().describe('Organization ID'),
  projectId: z.uuid().nullable().describe('Project ID'),
  createdById: z.uuid().describe('Creator user ID'),
});

export const createNodeResponseSchema = nodeResponseSchema.extend({
  psk: z.string().describe('Pre-shared key for node bootstrap (shown only once)'),
});

export const listNodesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().describe('Search by name'),
  status: nodeStatusSchema.optional().describe('Filter by status'),
  projectId: z.uuid().optional().describe('Filter by project ID'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'status']).default('createdAt').describe('Sort field'),
  order: sortOrderSchema,
});

export const bootstrapRequestSchema = z.object({
  psk: z.string().describe('Pre-shared key for node authentication'),
  csr: z.string().describe('Certificate Signing Request'),
  ec_public_key: z.string().describe('EC public key for Flower authentication'),
});

export const bootstrapResponseSchema = z.object({
  certificate: z.string().describe('Node certificate'),
  issuing_ca: z.string().describe('Issuing Certificate Authority'),
  ca_chain: z.array(z.string()).describe('Certificate Authority chain'),
  serial_number: z.string().describe('Certificate serial number'),
  expiration: z.number().describe('Certificate expiration timestamp'),
  mentishub_root_ca: z.string().describe('MentisHub Root CA for SuperLink validation'),
});

export const renewCertificateRequestSchema = z.object({
  csr: z.string().describe('Certificate Signing Request'),
});

export const renewCertificateResponseSchema = z.object({
  certificate: z.string().describe('Renewed node certificate'),
  issuing_ca: z.string().describe('Issuing Certificate Authority'),
  ca_chain: z.array(z.string()).describe('Certificate Authority chain'),
  serial_number: z.string().describe('Certificate serial number'),
  expiration: z.number().describe('Certificate expiration timestamp'),
  mentishub_root_ca: z.string().describe('MentisHub Root CA for SuperLink validation'),
});
