import {
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  createNodeResponseSchema,
  createNodeSchema,
  heartbeatResponseSchema,
  listNodesQuerySchema,
  nodeResponseSchema,
  paginatedNodesResponseSchema,
  recoverRequestSchema,
  recoverResponseSchema,
  refreshTokenRequestSchema,
  refreshTokenResponseSchema,
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
      accessToken: bundle.accessToken,
      refreshToken: bundle.refreshToken,
      expiresAt: bundle.expiresAt.toISOString(),
    });
  }
}

export class RefreshTokenRequestDto extends createZodDto(
  refreshTokenRequestSchema,
) {}

export class RefreshTokenResponseDto extends createZodDto(
  refreshTokenResponseSchema,
) {
  static fromData(data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): RefreshTokenResponseDto {
    return refreshTokenResponseSchema.parse({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt.toISOString(),
    });
  }
}

export class RecoverRequestDto extends createZodDto(recoverRequestSchema) {}

export class RecoverResponseDto extends createZodDto(recoverResponseSchema) {
  static fromData(data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): RecoverResponseDto {
    return recoverResponseSchema.parse({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt.toISOString(),
    });
  }
}

export class HeartbeatResponseDto extends createZodDto(
  heartbeatResponseSchema,
) {}
