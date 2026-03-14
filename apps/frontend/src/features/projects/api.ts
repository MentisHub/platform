import { api } from "@/lib/api/client";
import type {
  ProjectResponse,
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsQuery,
  PaginatedProjectsResponse,
} from "@platform/contracts";

export const projectsApi = {
  list: (orgId: string, params?: ListProjectsQuery) =>
    api.get<PaginatedProjectsResponse>(
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
