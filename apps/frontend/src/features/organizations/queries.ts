"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { organizationsApi } from "./api";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  ListOrganizationsQuery,
} from "@platform/contracts";

export function useOrganizations(params?: ListOrganizationsQuery) {
  return useQuery({
    queryKey: queryKeys.organizations.list(params),
    queryFn: () => organizationsApi.list(params),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: () => organizationsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganizationInput) => organizationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.organizations.lists() });
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationInput }) =>
      organizationsApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.organizations.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.organizations.lists() });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationsApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: queryKeys.organizations.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.organizations.lists() });
    },
  });
}
