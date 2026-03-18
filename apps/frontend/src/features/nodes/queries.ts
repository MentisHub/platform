"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { nodesApi } from "./api";
import type { CreateNodeInput, UpdateNodeInput, ListNodesQuery } from "@platform/contracts";

export function useNodes(orgId: string, params?: Partial<ListNodesQuery>) {
  return useQuery({
    queryKey: queryKeys.nodes.list(orgId, params),
    queryFn: () => nodesApi.list(orgId, params),
    enabled: !!orgId,
  });
}

export function useNode(orgId: string, nodeId: string) {
  return useQuery({
    queryKey: queryKeys.nodes.detail(nodeId),
    queryFn: () => nodesApi.get(orgId, nodeId),
    enabled: !!orgId && !!nodeId,
  });
}

export function useCreateNode(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNodeInput) => nodesApi.create(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.nodes.lists() });
    },
  });
}

export function useUpdateNode(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, data }: { nodeId: string; data: UpdateNodeInput }) =>
      nodesApi.update(orgId, nodeId, data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.nodes.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.nodes.lists() });
    },
  });
}

export function useDeleteNode(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => nodesApi.remove(orgId, nodeId),
    onSuccess: (_, nodeId) => {
      qc.removeQueries({ queryKey: queryKeys.nodes.detail(nodeId) });
      qc.invalidateQueries({ queryKey: queryKeys.nodes.lists() });
    },
  });
}
