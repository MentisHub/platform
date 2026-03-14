import { z } from 'zod';
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
