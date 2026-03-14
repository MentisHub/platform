import { z } from 'zod';

export const metricsQuerySchema = z.object({
  start: z
    .string()
    .optional()
    .describe('Start time as ISO8601 string or unix seconds (default: 1 hour ago)'),
  end: z
    .string()
    .optional()
    .describe('End time as ISO8601 string or unix seconds (default: now)'),
  step: z
    .string()
    .optional()
    .describe('Resolution step as Prometheus duration string, e.g. "30s", "1m" (default: 1m)'),
  trainingRunId: z
    .uuid()
    .optional()
    .describe('Filter metrics for a specific training run UUID'),
});

export const metricsSeriesSchema = z.object({
  metric: z
    .record(z.string(), z.string())
    .describe('Metric labels — __name__ holds the metric name, remaining keys are its label set'),
  values: z
    .array(z.tuple([z.number(), z.string()]))
    .describe('Time series data points as [unix_timestamp_seconds, value] pairs'),
});

export const metricsResponseSchema = z.object({
  projectId: z.uuid().describe('Project UUID these metrics belong to'),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
    step: z.string(),
  }),
  series: z.array(metricsSeriesSchema),
});

export const metricsStreamQuerySchema = z.object({
  trainingRunId: z
    .uuid()
    .optional()
    .describe('Restrict the stream to a single training run UUID'),
});

export const metricsStreamSeriesSchema = z.object({
  metric: z
    .record(z.string(), z.string())
    .describe('Metric labels — __name__ holds the metric name'),
  value: z
    .tuple([z.number(), z.string()])
    .describe('Most recent data point as [unix_timestamp_seconds, value]'),
});

export const metricsStreamEventSchema = z.object({
  projectId: z.uuid(),
  timestamp: z.number().describe('Server-side unix timestamp of this snapshot'),
  series: z.array(metricsStreamSeriesSchema),
});
