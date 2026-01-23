import { z } from 'zod';
import { paginatedResponseSchema } from '../common/pagination.dto';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectResponseSchema,
  updateProjectSchema,
} from './project.schema';

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const paginatedProjectsResponseSchema =
  paginatedResponseSchema(projectResponseSchema);
export type PaginatedProjectsResponse = z.infer<typeof paginatedProjectsResponseSchema>;
