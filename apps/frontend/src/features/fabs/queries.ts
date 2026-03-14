"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { fabsApi } from "./api";
import type { UploadFabInput, ListFabsQuery } from "@platform/contracts";

export function useFabs(orgId: string, params?: ListFabsQuery) {
  return useQuery({
    queryKey: queryKeys.fabs.list(orgId, params),
    queryFn: () => fabsApi.list(orgId, params),
    enabled: !!orgId,
  });
}

export function useFab(orgId: string, fabId: string) {
  return useQuery({
    queryKey: queryKeys.fabs.detail(fabId),
    queryFn: () => fabsApi.get(orgId, fabId),
    enabled: !!orgId && !!fabId,
  });
}

export function useUploadFab(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, data }: { file: File; data: UploadFabInput }) =>
      fabsApi.upload(orgId, file, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fabs.lists() });
    },
  });
}

export function useDeleteFab(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fabId: string) => fabsApi.remove(orgId, fabId),
    onSuccess: (_, fabId) => {
      qc.removeQueries({ queryKey: queryKeys.fabs.detail(fabId) });
      qc.invalidateQueries({ queryKey: queryKeys.fabs.lists() });
    },
  });
}
