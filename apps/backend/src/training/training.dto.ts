import {
  startTrainingResponseSchema,
  startTrainingSchema,
  trainingRunResponseSchema,
} from '@platform/contracts';
import type { Node, TrainingRun } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

export class StartTrainingDto extends createZodDto(startTrainingSchema) {}

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
      createdAt: entity.createdAt.toISOString(),
      startedAt: entity.startedAt?.toISOString() ?? null,
      completedAt: entity.completedAt?.toISOString() ?? null,
    });
  }
}
