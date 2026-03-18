import { api } from "@/lib/api/client";
import type { MetricsQuery, MetricsResponse } from "@platform/contracts";

export const metricsApi = {
  range: (projectId: string, params?: Partial<MetricsQuery>) =>
    api.get<MetricsResponse>(`/projects/${projectId}/metrics`, params),
};
