import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Prisma } from '@prisma/client';

export interface FabMetadataFromFilename {
  publisherName: string;
  name: string;
  version: string;
  fabHash: string;
}

export function extractFabMetadataFromFilename(
  filename: string,
): FabMetadataFromFilename {
  // Expected format: publisher.name.version.hash.fab
  // Example: MentisHub.fl-app.0-1-0.83f25fa2.fab
  const fabPattern = /^([^.]+)\.([^.]+)\.(\d+-\d+-\d+)\.([a-f0-9]+)\.fab$/i;
  const match = filename.match(fabPattern);

  if (!match) {
    throw new BadRequestException({
      code: ErrorCode.INVALID_FAB_FILENAME,
      message:
        'Invalid FAB filename format. Expected: publisher.name.version.hash.fab',
    });
  }

  return {
    publisherName: match[1],
    name: match[2],
    version: match[3].replace(/-/g, '.'), // Convert 0-1-0 to 0.1.0
    fabHash: match[4],
  };
}

export function buildFabStoragePath(
  organizationId: string,
  fabHash: string,
  version: string,
  projectId?: string,
): string {
  const basePath = `organizations/${organizationId}`;
  const projectPath = projectId ? `/projects/${projectId}` : '';
  return `${basePath}${projectPath}/${fabHash}-${version}.fab`;
}

export function buildDefaultFabStoragePath(
  fabHash: string,
  version: string,
): string {
  return `default/${fabHash}-${version}.fab`;
}

export function buildFabAccessFilter(
  organizationId: string,
  projectId?: string,
  includeDefault = true,
  includePublic = true,
) {
  const filters: Prisma.FabWhereInput[] = [];

  if (projectId) {
    filters.push({ organizationId, projectId });
  } else {
    filters.push({ organizationId });
  }

  if (includeDefault) filters.push({ isDefault: true });
  if (includePublic) filters.push({ isPublic: true });

  return filters;
}
