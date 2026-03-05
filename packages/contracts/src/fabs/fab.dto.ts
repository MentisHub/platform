import type { z } from 'zod';
import {
  fabResponseSchema,
  listFabsQuerySchema,
  uploadDefaultFabSchema,
  uploadFabSchema,
} from './fab.schema';
import { paginatedResponseSchema } from '../common';

export type UploadFabInput = z.infer<typeof uploadFabSchema>;
export type UploadDefaultFabInput = z.infer<typeof uploadDefaultFabSchema>;
export type FabResponse = z.infer<typeof fabResponseSchema>;
export type ListFabsQuery = z.infer<typeof listFabsQuerySchema>;

export const paginatedFabsResponseSchema =
  paginatedResponseSchema(fabResponseSchema);
export type PaginatedFabsResponse = z.infer<typeof paginatedFabsResponseSchema>;
