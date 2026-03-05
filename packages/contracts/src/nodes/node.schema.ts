import { z } from 'zod';
import { paginationQuerySchema, sortOrderSchema } from '../common/pagination.dto';

export const nodeStatusSchema = z.enum([
  'CREATED',      // Node just created, waiting for bootstrap (certificate issuance)
  'INITIALIZING', // Node activated, downloading FAB and installing dependencies
  'READY',        // Node has valid certificate and is ready to participate in training
  'TRAINING',     // Node is currently participating in an active training run
  'ERROR',        // Node encountered an error (e.g., certificate issues, connection problems)
  'OFFLINE',      // Node is disconnected or unreachable
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
  ecPublicKey: z.string().describe('Elliptic Curve public key for secure communication'),
});

export const bootstrapResponseSchema = z.object({
  rootCa: z.string().describe('Root Certificate Authority certificate (PEM format)'),
  clientCert: z.string().describe('Node client certificate signed by the CA (PEM format, 7-day TTL)'),
  nodeId: z.string().optional().describe('Flower federation node ID'),
});

export const rotateRequestSchema = z.object({
  nodeId: z.string().uuid().describe('Node UUID'),
  challenge: z.string().describe('Challenge string to be signed'),
  signature: z.string().describe('Base64-encoded SSH signature of the challenge'),
});

export const rotateResponseSchema = z.object({
  rootCa: z.string().describe('Root Certificate Authority certificate (PEM format)'),
  clientCert: z.string().describe('New node client certificate signed by the CA (PEM format, 7-day TTL)'),
});
