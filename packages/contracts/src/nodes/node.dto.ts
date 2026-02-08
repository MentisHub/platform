import { z } from 'zod';
import { paginatedResponseSchema } from '../common/pagination.dto';
import {
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  createNodeResponseSchema,
  createNodeSchema,
  heartbeatResponseSchema,
  listNodesQuerySchema,
  nodeResponseSchema,
  recoverRequestSchema,
  recoverResponseSchema,
  refreshTokenRequestSchema,
  refreshTokenResponseSchema,
  updateNodeSchema,
} from './node.schema';

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
export type NodeResponse = z.infer<typeof nodeResponseSchema>;
export type CreateNodeResponse = z.infer<typeof createNodeResponseSchema>;
export type ListNodesQuery = z.infer<typeof listNodesQuerySchema>;
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;
export type RecoverRequest = z.infer<typeof recoverRequestSchema>;
export type RecoverResponse = z.infer<typeof recoverResponseSchema>;
export type HeartbeatResponse = z.infer<typeof heartbeatResponseSchema>;

export const paginatedNodesResponseSchema =
  paginatedResponseSchema(nodeResponseSchema);

export type PaginatedNodesResponse = z.infer<typeof paginatedNodesResponseSchema>;
