import { z } from 'zod';
import { paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const nodeStatusSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'INACTIVE',
]).describe('Current operational status of the node');

export const nodeBaseSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Human-readable name for the node'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom key-value metadata associated with the node'),
  projectId: z.uuid().optional().nullable().describe('Project UUID this node is assigned to'),
});

export const createNodeSchema = nodeBaseSchema;

export const updateNodeSchema = nodeBaseSchema.partial();

export const nodeResponseSchema = z.object({
  id: z.string().describe('Unique identifier of the node'),
  name: z.string().describe('Human-readable name for the node'),
  status: nodeStatusSchema,
  metadata: z.record(z.string(), z.any()).nullable().describe('Custom key-value metadata associated with the node'),
  createdAt: z.iso.datetime().describe('Timestamp when the node was created'),
  updatedAt: z.iso.datetime().describe('Timestamp when the node was last updated'),
  organizationId: z.uuid().describe('Organization UUID this node belongs to'),
  projectId: z.uuid().nullable().describe('Project UUID this node is assigned to'),
  createdById: z.uuid().describe('User ID who created the node'),
});

export const createNodeResponseSchema = nodeResponseSchema.extend({
  psk: z.string().describe('Pre-shared key for node bootstrap authentication (returned only once)'),
});

export const listNodesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional().describe('Filter nodes by name (partial match)'),
  status: nodeStatusSchema.optional(),
  projectId: z.uuid().optional().describe('Filter nodes by project UUID'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'status']).default('createdAt').describe('Field to sort results by'),
  order: sortOrderSchema,
});

export const bootstrapRequestSchema = z.object({
  psk: z.string().describe('Pre-shared key issued during node creation'),
  csr: z.string().describe('Certificate Signing Request (PEM format)'),
  ecPublicKey: z.string().describe('Elliptic Curve public key for secure communication'),
});

export const bootstrapResponseSchema = z.object({
  certificate: z.string().describe('Issued TLS certificate (PEM format)'),
  issuingCa: z.string().describe('Issuing Certificate Authority certificate (PEM format)'),
  caChain: z.array(z.string()).describe('Certificate Authority chain (PEM format)'),
  serialNumber: z.string().describe('Certificate serial number in hexadecimal format'),
  expiration: z.number().describe('Certificate expiration timestamp (Unix epoch)'),
  rootCa: z.string().describe('Root Certificate Authority certificate (PEM format)'),
});

export const renewCertificateRequestSchema = z.object({
  csr: z.string().describe('Certificate Signing Request (PEM format)'),
});

export const renewCertificateResponseSchema = z.object({
  certificate: z.string().describe('Renewed TLS certificate (PEM format)'),
  issuingCa: z.string().describe('Issuing Certificate Authority certificate (PEM format)'),
  caChain: z.array(z.string()).describe('Certificate Authority chain (PEM format)'),
  serialNumber: z.string().describe('New certificate serial number in hexadecimal format'),
  expiration: z.number().describe('New certificate expiration timestamp (Unix epoch)'),
  rootCa: z.string().describe('Root Certificate Authority certificate (PEM format)'),
});
