import {
  createTrainingSchema,
  linkNodeToTrainingResponse,
  linkNodeToTrainingSchema,
  runTrainingSchema,
  startTrainingResponseSchema,
  trainingRunResponseSchema,
} from '@platform/contracts';
import type { TrainingRun } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

export class CreateTrainingDto extends createZodDto(createTrainingSchema) {}

export class RunTrainingDto extends createZodDto(runTrainingSchema) {}

export class StartTrainingResponseDto extends createZodDto(
  startTrainingResponseSchema,
) {
  static fromEntity(entity: TrainingRun): StartTrainingResponseDto {
    return startTrainingResponseSchema.parse({
      trainingRunId: entity.id,
      status: entity.status,
    });
  }
}

export class TrainingRunResponseDto extends createZodDto(
  trainingRunResponseSchema,
) {
  static fromEntity(entity: TrainingRun): TrainingRunResponseDto {
    return trainingRunResponseSchema.parse({
      id: entity.id,
      status: entity.status,
      projectId: entity.projectId,
      configuration: (entity.configuration as Record<string, unknown>) ?? null,
      createdAt: entity.createdAt.toISOString(),
      startedAt: entity.startedAt?.toISOString() ?? null,
      completedAt: entity.completedAt?.toISOString() ?? null,
    });
  }
}

export class LinkNodeToTrainingDto extends createZodDto(
  linkNodeToTrainingSchema,
) {}

export class LinkNodeToTrainingResponse extends createZodDto(
  linkNodeToTrainingResponse,
) {}
