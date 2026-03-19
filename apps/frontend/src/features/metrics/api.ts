import { api, API_BASE_URL } from "@/lib/api/client";
import type { MetricsQuery, MetricsResponse } from "@platform/contracts";

export const metricsApi = {
  range: (projectId: string, runId: string, params?: MetricsQuery) =>
    api.get<MetricsResponse>(
      `/projects/${projectId}/runs/${runId}/metrics`,
      params,
    ),

  streamUrl: (projectId: string, runId: string): string =>
    `${API_BASE_URL}/projects/${projectId}/runs/${runId}/metrics/stream`,
};
