import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  organizationResponseSchema,
  paginatedOrganizationsResponseSchema,
  replaceOrganizationSchema,
  updateOrganizationSchema,
} from '@platform/contracts';
import { Organization } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

export class CreateOrganizationDto extends createZodDto(
  createOrganizationSchema,
) {}
export class UpdateOrganizationDto extends createZodDto(
  updateOrganizationSchema,
) {}
export class ReplaceOrganizationDto extends createZodDto(
  replaceOrganizationSchema,
) {}
export class ListOrganizationsQueryDto extends createZodDto(
  listOrganizationsQuerySchema,
) {}
export class OrganizationResponseDto extends createZodDto(
  organizationResponseSchema,
) {
  static fromEntity(entity: Organization): OrganizationResponseDto {
    return organizationResponseSchema.parse({
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }
}

export class PaginatedOrganizationsResponseDto extends createZodDto(
  paginatedOrganizationsResponseSchema,
) {}
