import {
  createProjectSchema,
  listProjectsQuerySchema,
  paginatedProjectsResponseSchema,
  projectResponseSchema,
  updateProjectSchema,
} from '@platform/contracts';
import { Project } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

export class CreateProjectDto extends createZodDto(createProjectSchema) {}

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}

export class ListProjectsQueryDto extends createZodDto(
  listProjectsQuerySchema,
) {}

export class ProjectResponseDto extends createZodDto(projectResponseSchema) {
  static fromEntity(entity: Project): ProjectResponseDto {
    return projectResponseSchema.parse({
      id: entity.id,
      name: entity.name,
      organizationId: entity.organizationId,
      trainingConfig: entity.trainingConfig,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }
}

export class PaginatedProjectsResponseDto extends createZodDto(
  paginatedProjectsResponseSchema,
) {}

export type { PaginatedProjectsResponse } from '@platform/contracts';
