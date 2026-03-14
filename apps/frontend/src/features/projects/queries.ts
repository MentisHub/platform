"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { projectsApi } from "./api";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsQuery,
} from "@platform/contracts";

export function useProjects(orgId: string, params?: ListProjectsQuery) {
  return useQuery({
    queryKey: queryKeys.projects.list(orgId, params),
    queryFn: () => projectsApi.list(orgId, params),
    enabled: !!orgId,
  });
}

export function useProject(orgId: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => projectsApi.get(orgId, projectId),
    enabled: !!orgId && !!projectId,
  });
}

export function useCreateProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsApi.create(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useUpdateProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateProjectInput }) =>
      projectsApi.update(orgId, projectId, data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.projects.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useDeleteProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.remove(orgId, projectId),
    onSuccess: (_, projectId) => {
      qc.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}
