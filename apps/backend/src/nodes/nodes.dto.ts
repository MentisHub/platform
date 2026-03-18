import {
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  createNodeResponseSchema,
  createNodeSchema,
  listNodesQuerySchema,
  nodeResponseSchema,
  paginatedNodesResponseSchema,
  rotateRequestSchema,
  rotateResponseSchema,
  updateNodeSchema,
} from '@platform/contracts';
import { Node } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { NodeCertificateBundle } from './nodes.interface';

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
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      createdById: entity.createdById,
      flowerNodeId: entity.flowerNodeId ?? null,
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

export class PaginatedNodesResponseDto extends createZodDto(
  paginatedNodesResponseSchema,
) {}

export class BootstrapRequestDto extends createZodDto(bootstrapRequestSchema) {}

export class BootstrapResponseDto extends createZodDto(
  bootstrapResponseSchema,
) {
  static fromEntity(bundle: NodeCertificateBundle): BootstrapResponseDto {
    return bootstrapResponseSchema.parse({
      rootCa: bundle.rootCa,
      clientCert: bundle.clientCert,
      nodeId: bundle.nodeId,
    });
  }
}

export class RotateRequestDto extends createZodDto(rotateRequestSchema) {}

export class RotateResponseDto extends createZodDto(rotateResponseSchema) {
  static fromEntity(bundle: NodeCertificateBundle): RotateResponseDto {
    return rotateResponseSchema.parse({
      rootCa: bundle.rootCa,
      clientCert: bundle.clientCert,
    });
  }
}
