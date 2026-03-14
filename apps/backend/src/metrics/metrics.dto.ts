import {
  metricsQuerySchema,
  metricsResponseSchema,
  metricsStreamEventSchema,
  metricsStreamQuerySchema,
} from '@platform/contracts';
import { createZodDto } from 'nestjs-zod';

export class MetricsQueryDto extends createZodDto(metricsQuerySchema) {}

export class MetricsResponseDto extends createZodDto(metricsResponseSchema) {}

export class MetricsStreamQueryDto extends createZodDto(
  metricsStreamQuerySchema,
) {}

export class MetricsStreamEventDto extends createZodDto(
  metricsStreamEventSchema,
) {}
