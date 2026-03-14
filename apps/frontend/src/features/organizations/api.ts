import { api } from "@/lib/api/client";
import type {
  OrganizationResponse,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  ListOrganizationsQuery,
  PaginatedResponse,
} from "@platform/contracts";

export const organizationsApi = {
  list: (params?: ListOrganizationsQuery) =>
    api.get<PaginatedResponse<OrganizationResponse>>("/organizations", params),

  get: (id: string) =>
    api.get<OrganizationResponse>(`/organizations/${id}`),

  create: (data: CreateOrganizationInput) =>
    api.post<OrganizationResponse>("/organizations", data),

  update: (id: string, data: UpdateOrganizationInput) =>
    api.patch<OrganizationResponse>(`/organizations/${id}`, data),

  remove: (id: string) =>
    api.delete(`/organizations/${id}`),
};
