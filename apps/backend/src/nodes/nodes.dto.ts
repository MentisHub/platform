import {
  createNodeResponseSchema,
  createNodeSchema,
  listNodesQuerySchema,
  nodeResponseSchema,
  updateNodeSchema,
  bootstrapRequestSchema,
  bootstrapResponseSchema,
} from '@platform/contracts';
import { Node } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

export class CreateNodeDto extends createZodDto(createNodeSchema) {}
export class UpdateNodeDto extends createZodDto(updateNodeSchema) {}
export class ListNodesQueryDto extends createZodDto(listNodesQuerySchema) {}

export class NodeResponseDto extends createZodDto(nodeResponseSchema) {
  static fromEntity(entity: Node): NodeResponseDto {
    return nodeResponseSchema.parse({
      id: entity.id,
      name: entity.name,
      status: entity.status,
      metadata: entity.metadata,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      deletedAt: entity.deletedAt?.toISOString() ?? null,
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      createdById: entity.createdById,
    });
  }
}

export class CreateNodeResponseDto extends createZodDto(
  createNodeResponseSchema,
) {
  static fromEntityWithPSK(entity: Node, psk: string): CreateNodeResponseDto {
    return createNodeResponseSchema.parse({
      ...NodeResponseDto.fromEntity(entity),
      psk,
    });
  }
}

export type { PaginatedNodesResponse } from '@platform/contracts';

export class BootstrapRequestDto extends createZodDto(bootstrapRequestSchema) {}

export class BootstrapResponseDto extends createZodDto(
  bootstrapResponseSchema,
) {}
