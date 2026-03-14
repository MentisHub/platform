import { api } from "@/lib/api/client";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  PaginatedResponse,
  ProjectResponse,
  UpdateProjectInput,
} from "@platform/contracts";

export const projectsApi = {
  list: (orgId: string, params?: Partial<ListProjectsQuery>) =>
    api.get<PaginatedResponse<ProjectResponse>>(
      `/organizations/${orgId}/projects`,
      params,
    ),

  get: (orgId: string, projectId: string) =>
    api.get<ProjectResponse>(`/organizations/${orgId}/projects/${projectId}`),

  create: (orgId: string, data: CreateProjectInput) =>
    api.post<ProjectResponse>(`/organizations/${orgId}/projects`, data),

  update: (orgId: string, projectId: string, data: UpdateProjectInput) =>
    api.patch<ProjectResponse>(
      `/organizations/${orgId}/projects/${projectId}`,
      data,
    ),

  remove: (orgId: string, projectId: string) =>
    api.delete(`/organizations/${orgId}/projects/${projectId}`),
};
