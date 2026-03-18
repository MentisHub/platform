import {
  fabResponseSchema,
  listFabsQuerySchema,
  paginatedFabsResponseSchema,
  uploadDefaultFabSchema,
  uploadFabSchema,
} from '@platform/contracts';
import type { Fab } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

export class UploadFabDto extends createZodDto(uploadFabSchema) {}

export class UploadDefaultFabDto extends createZodDto(uploadDefaultFabSchema) {}

export class ListFabsQueryDto extends createZodDto(listFabsQuerySchema) {}

export class FabResponseDto extends createZodDto(fabResponseSchema) {
  static fromEntity(fab: Fab): FabResponseDto {
    return fabResponseSchema.parse({
      id: fab.id,
      name: fab.name,
      publisherName: fab.publisherName,
      description: fab.description,
      fabHash: fab.fabHash,
      version: fab.version,
      storagePath: fab.storagePath,
      sizeBytes: fab.sizeBytes.toString(),
      isDefault: fab.isDefault,
      isPublic: fab.isPublic,
      tags: fab.tags,
      organizationId: fab.organizationId,
      projectId: fab.projectId,
      createdAt: fab.createdAt.toISOString(),
    });
  }
}

export class PaginatedFabsResponseDto extends createZodDto(
  paginatedFabsResponseSchema,
) {}
