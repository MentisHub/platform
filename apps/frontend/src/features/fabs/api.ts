import { api } from "@/lib/api/client";
import type {
  FabResponse,
  UploadFabInput,
  ListFabsQuery,
  PaginatedFabsResponse,
} from "@platform/contracts";

export const fabsApi = {
  list: (orgId: string, params?: ListFabsQuery) =>
    api.get<PaginatedFabsResponse>(
      `/organizations/${orgId}/fabs`,
      params,
    ),

  get: (orgId: string, fabId: string) =>
    api.get<FabResponse>(`/organizations/${orgId}/fabs/${fabId}`),

  upload: (orgId: string, file: File, data: UploadFabInput) => {
    const form = new FormData();
    form.append("file", file);
    if (data.description) form.append("description", data.description);
    if (data.projectId)   form.append("projectId",   data.projectId);
    form.append("isPublic", String(data.isPublic ?? false));
    return api.post<FabResponse>(`/organizations/${orgId}/fabs`, form);
  },

  remove: (orgId: string, fabId: string) =>
    api.delete(`/organizations/${orgId}/fabs/${fabId}`),
};
