export interface PrometheusRangeResponse {
  status: 'success' | 'error';
  error?: string;
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values: Array<[number, string]>;
    }>;
  };
}

export interface PrometheusMetadataResponse {
  status: 'success' | 'error';
  data?: Record<string, Array<{ type: string; help: string; unit: string }>>;
}

export interface PrometheusInstantResponse {
  status: 'success' | 'error';
  error?: string;
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}
