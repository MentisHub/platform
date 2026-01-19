import type { z } from 'zod';
import type { PaginatedResponse } from '../common/pagination.dto';
import type {
  fabResponseSchema,
  listFabsQuerySchema,
  uploadDefaultFabSchema,
  uploadFabSchema,
} from './fab.schema';

export type UploadFabInput = z.infer<typeof uploadFabSchema>;
export type UploadDefaultFabInput = z.infer<typeof uploadDefaultFabSchema>;
export type FabResponse = z.infer<typeof fabResponseSchema>;
export type ListFabsQuery = z.infer<typeof listFabsQuerySchema>;

export type PaginatedFabsResponse = PaginatedResponse<FabResponse>;
