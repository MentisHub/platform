import { z } from 'zod';
import {
  createNodeSchema,
  updateNodeSchema,
  nodeResponseSchema,
  createNodeResponseSchema,
  listNodesQuerySchema,
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  renewCertificateRequestSchema,
  renewCertificateResponseSchema,
} from './node.schema';
import { PaginatedResponse } from '../common/pagination.dto';

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
export type NodeResponse = z.infer<typeof nodeResponseSchema>;
export type CreateNodeResponse = z.infer<typeof createNodeResponseSchema>;
export type ListNodesQuery = z.infer<typeof listNodesQuerySchema>;
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type RenewCertificateRequest = z.infer<typeof renewCertificateRequestSchema>;
export type RenewCertificateResponse = z.infer<typeof renewCertificateResponseSchema>;

export type PaginatedNodesResponse = PaginatedResponse<NodeResponse>;
