import { api } from "@/lib/api/client";
import type {
  NodeResponse,
  CreateNodeInput,
  UpdateNodeInput,
  CreateNodeResponse,
  ListNodesQuery,
  PaginatedNodesResponse,
} from "@platform/contracts";

export const nodesApi = {
  list: (orgId: string, params?: ListNodesQuery) =>
    api.get<PaginatedNodesResponse>(
      `/organizations/${orgId}/nodes`,
      params,
    ),

  get: (orgId: string, nodeId: string) =>
    api.get<NodeResponse>(`/organizations/${orgId}/nodes/${nodeId}`),

  create: (orgId: string, data: CreateNodeInput) =>
    api.post<CreateNodeResponse>(`/organizations/${orgId}/nodes`, data),

  update: (orgId: string, nodeId: string, data: UpdateNodeInput) =>
    api.patch<NodeResponse>(`/organizations/${orgId}/nodes/${nodeId}`, data),

  remove: (orgId: string, nodeId: string) =>
    api.delete(`/organizations/${orgId}/nodes/${nodeId}`),
};
