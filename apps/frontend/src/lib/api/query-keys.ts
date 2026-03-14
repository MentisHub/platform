import type {
  ListOrganizationsQuery,
  ListProjectsQuery,
  ListNodesQuery,
  ListFabsQuery,
} from "@platform/contracts";

export const queryKeys = {
  organizations: {
    all: ["organizations"] as const,
    lists: () => [...queryKeys.organizations.all, "list"] as const,
    list: (params?: Partial<ListOrganizationsQuery>) =>
      [...queryKeys.organizations.lists(), params] as const,
    details: () => [...queryKeys.organizations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
  },

  projects: {
    all: ["projects"] as const,
    lists: () => [...queryKeys.projects.all, "list"] as const,
    list: (orgId: string, params?: Partial<ListProjectsQuery>) =>
      [...queryKeys.projects.lists(), orgId, params] as const,
    details: () => [...queryKeys.projects.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  nodes: {
    all: ["nodes"] as const,
    lists: () => [...queryKeys.nodes.all, "list"] as const,
    list: (orgId: string, params?: ListNodesQuery) =>
      [...queryKeys.nodes.lists(), orgId, params] as const,
    details: () => [...queryKeys.nodes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.nodes.details(), id] as const,
  },

  training: {
    all: ["training"] as const,
    details: () => [...queryKeys.training.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.training.details(), id] as const,
  },

  fabs: {
    all: ["fabs"] as const,
    lists: () => [...queryKeys.fabs.all, "list"] as const,
    list: (orgId: string, params?: ListFabsQuery) =>
      [...queryKeys.fabs.lists(), orgId, params] as const,
    details: () => [...queryKeys.fabs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.fabs.details(), id] as const,
  },
} as const;
