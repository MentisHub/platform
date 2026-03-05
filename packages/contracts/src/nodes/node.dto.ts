import { z } from 'zod';
import { paginatedResponseSchema } from '../common/pagination.dto';
import {
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  createNodeResponseSchema,
  createNodeSchema,
  listNodesQuerySchema,
  nodeResponseSchema,
  rotateRequestSchema,
  rotateResponseSchema,
  updateNodeSchema,
} from './node.schema';

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
export type NodeResponse = z.infer<typeof nodeResponseSchema>;
export type CreateNodeResponse = z.infer<typeof createNodeResponseSchema>;
export type ListNodesQuery = z.infer<typeof listNodesQuerySchema>;
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type RotateRequest = z.infer<typeof rotateRequestSchema>;
export type RotateResponse = z.infer<typeof rotateResponseSchema>;

export const paginatedNodesResponseSchema =
  paginatedResponseSchema(nodeResponseSchema);

export type PaginatedNodesResponse = z.infer<typeof paginatedNodesResponseSchema>;
