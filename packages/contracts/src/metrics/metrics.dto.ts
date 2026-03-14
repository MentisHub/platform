import { z } from 'zod';
import {
  metricsQuerySchema,
  metricsResponseSchema,
  metricsSeriesSchema,
  metricsStreamEventSchema,
  metricsStreamQuerySchema,
  metricsStreamSeriesSchema,
} from './metrics.schema';

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type MetricsSeries = z.infer<typeof metricsSeriesSchema>;
export type MetricsResponse = z.infer<typeof metricsResponseSchema>;

export type MetricsStreamQuery = z.infer<typeof metricsStreamQuerySchema>;
export type MetricsStreamSeries = z.infer<typeof metricsStreamSeriesSchema>;
export type MetricsStreamEvent = z.infer<typeof metricsStreamEventSchema>;
