import {
  fabPackageResponseSchema,
  fabResponseSchema,
  listFabsQuerySchema,
  paginatedFabsResponseSchema,
  uploadDefaultFabSchema,
  uploadFabSchema,
} from '@platform/contracts';
import type { Fab } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { uuidToBase32 } from 'src/utils';
import { FabPackage } from './fabs.interface';

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
      storageBucket: fab.storageBucket,
      sizeBytes: fab.sizeBytes.toString(),
      isDefault: fab.isDefault,
      isPublic: fab.isPublic,
      organizationId: fab.organizationId,
      projectId: fab.projectId,
      createdAt: fab.createdAt.toISOString(),
    });
  }
}

export class FabPackageResponseDto extends createZodDto(
  fabPackageResponseSchema,
) {
  static fromEntity(fabPackage: FabPackage): FabPackageResponseDto {
    const { fab, trainingRun, content } = fabPackage;

    if (!trainingRun?.id) {
      throw new Error('Training run ID is required to generate federation name');
    }

    return fabPackageResponseSchema.parse({
      fabHash: fab.fabHash,
      version: fab.version,
      name: fab.name,
      publisherName: fab.publisherName,
      content: content.toString('base64'),
      federationName: uuidToBase32(trainingRun.id),
    });
  }
}

export class PaginatedFabsResponseDto extends createZodDto(
  paginatedFabsResponseSchema,
) {}
