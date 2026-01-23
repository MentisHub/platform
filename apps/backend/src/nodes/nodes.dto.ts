import {
  createNodeResponseSchema,
  createNodeSchema,
  listNodesQuerySchema,
  nodeResponseSchema,
  paginatedNodesResponseSchema,
  updateNodeSchema,
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  renewCertificateRequestSchema,
  renewCertificateResponseSchema,
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
      certificate: bundle.certificate,
      issuingCa: bundle.issuingCa,
      caChain: bundle.caChain,
      serialNumber: bundle.serialNumber,
      expiration: bundle.expiration,
      rootCa: bundle.rootCa,
    });
  }
}

export class RenewCertificateRequestDto extends createZodDto(
  renewCertificateRequestSchema,
) {}

export class RenewCertificateResponseDto extends createZodDto(
  renewCertificateResponseSchema,
) {
  static fromEntity(
    bundle: NodeCertificateBundle,
  ): RenewCertificateResponseDto {
    return renewCertificateResponseSchema.parse({
      certificate: bundle.certificate,
      issuingCa: bundle.issuingCa,
      caChain: bundle.caChain,
      serialNumber: bundle.serialNumber,
      expiration: bundle.expiration,
      rootCa: bundle.rootCa,
    });
  }
}
