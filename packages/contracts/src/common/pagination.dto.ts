import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).describe('Page number'),
  limit: z.coerce.number().int().positive().max(100).default(10).describe('Items per page'),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc').describe('Sort order direction');

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
