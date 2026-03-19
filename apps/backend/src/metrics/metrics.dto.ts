import {
  metricsQuerySchema,
  metricsResponseSchema,
  metricsStreamEventSchema,
} from '@platform/contracts';
import { createZodDto } from 'nestjs-zod';

export class MetricsQueryDto extends createZodDto(metricsQuerySchema) {}

export class MetricsResponseDto extends createZodDto(metricsResponseSchema) {}

export class MetricsStreamEventDto extends createZodDto(
  metricsStreamEventSchema,
) {}
