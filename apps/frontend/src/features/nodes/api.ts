import { api } from "@/lib/api/client";
import type {
  CreateNodeInput,
  CreateNodeResponse,
  ListNodesQuery,
  NodeResponse,
  PaginatedResponse,
  UpdateNodeInput,
} from "@platform/contracts";

export const nodesApi = {
  list: (orgId: string, params?: Partial<ListNodesQuery>) =>
    api.get<PaginatedResponse<NodeResponse>>(
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
