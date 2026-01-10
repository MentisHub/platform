import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Node, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { generatePSKWithHash, hashPSK, uuidToBase32 } from '../utils';
import { VaultService } from '../vault/vault.service';
import {
  BootstrapResponseDto,
  CreateNodeDto,
  ListNodesQueryDto,
  RenewCertificateResponseDto,
  UpdateNodeDto,
} from './nodes.dto';

type CreateNodeInput = CreateNodeDto;
type ListNodesQuery = ListNodesQueryDto;
type UpdateNodeInput = UpdateNodeDto;

@Injectable()
export class NodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: CreateNodeInput,
  ): Promise<{ node: Node; psk: string }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (input.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId,
        },
      });

      if (!project) {
        throw new NotFoundException({
          statusCode: 404,
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'Project not found',
        });
      }
    }

    const { psk, hash } = generatePSKWithHash();

    const name = input.name || `node-${randomBytes(4).toString('hex')}`;

    const node = await this.prisma.node.create({
      data: {
        name,
        id: hash,
        metadata: input.metadata,
        organizationId,
        projectId: input.projectId,
        createdById: userId,
      },
    });

    const orgIdBase32 = uuidToBase32(organizationId);

    return { node, psk: `${orgIdBase32}.${psk}` };
  }

  async findAll(
    organizationId: string,
    input: ListNodesQuery,
  ): Promise<{ nodes: Node[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      projectId,
      sortBy = 'createdAt',
      order = 'desc',
    } = input;

    const where: Prisma.NodeWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const [nodes, total] = await Promise.all([
      this.prisma.node.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
      }),
      this.prisma.node.count({ where }),
    ]);

    return { nodes, total };
  }

  async findOne(organizationId: string, nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findFirst({
      where: {
        id: nodeId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!node) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    return node;
  }

  async update(
    organizationId: string,
    nodeId: string,
    input: UpdateNodeInput,
  ): Promise<Node> {
    const node = await this.findOne(organizationId, nodeId);

    if (input.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId,
        },
      });

      if (!project) {
        throw new NotFoundException({
          statusCode: 404,
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: 'Project not found',
        });
      }
    }

    return this.prisma.node.update({
      where: { id: node.id },
      data: {
        name: input.name,
        metadata: input.metadata,
        projectId: input.projectId,
      },
    });
  }

  async remove(organizationId: string, nodeId: string): Promise<void> {
    const node = await this.findOne(organizationId, nodeId);

    await this.prisma.node.update({
      where: { id: node.id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async bootstrap(psk: string, csr: string): Promise<BootstrapResponseDto> {
    const pskParts = psk.split('.');
    const actualPsk = pskParts.length === 2 ? pskParts[1] : psk;
    const pskHash = hashPSK(actualPsk);

    const node = await this.prisma.node.findFirst({
      where: {
        id: pskHash,
        deletedAt: null,
        certificate: null,
      },
      include: {
        organization: {
          include: {
            ca: true,
          },
        },
      },
    });

    if (!node) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Node not found',
      });
    }

    if (!node.organization.ca) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Organization CA not found',
      });
    }

    const mountPath = node.organization.ca.vaultMountPath;
    const nodePrefix = node.id.substring(0, 12).replace(/[_-]/g, '');
    const orgIdBase32 = uuidToBase32(node.organization.id);
    const commonName = `${nodePrefix}.${orgIdBase32}.nodes.local`;

    const cert = await this.vault.pki.signNodeCertificate(
      mountPath,
      csr,
      commonName,
      '8760h',
    );

    await this.prisma.nodeCertificate.create({
      data: {
        nodeId: node.id,
        serialNumber: cert.serial_number.replace(/:/g, ''),
        issuedAt: new Date(),
        expiresAt: new Date(cert.expiration * 1000),
        revokedAt: null,
      },
    });

    return {
      certificate: cert.certificate,
      issuing_ca: cert.issuing_ca,
      ca_chain: cert.ca_chain,
      serial_number: cert.serial_number,
      expiration: cert.expiration,
    };
  }

  async renewCertificate(
    certificateSerial: string,
    csr: string,
  ): Promise<RenewCertificateResponseDto> {
    const certificate = await this.prisma.nodeCertificate.findFirst({
      where: {
        serialNumber: certificateSerial,
        revokedAt: null,
      },
      include: {
        node: {
          include: {
            organization: {
              include: {
                ca: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid or revoked certificate',
      });
    }

    const node = certificate.node;

    if (!node) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    if (!node.organization.ca) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Organization CA not found',
      });
    }

    if (certificate.expiresAt < new Date()) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Certificate expired. Please bootstrap the node again.',
      });
    }

    const mountPath = node.organization.ca.vaultMountPath;
    const nodePrefix = node.id.substring(0, 12).replace(/[_-]/g, '');
    const orgIdBase32 = uuidToBase32(node.organization.id);
    const commonName = `${nodePrefix}.${orgIdBase32}.nodes.local`;

    const newCert = await this.vault.pki.signNodeCertificate(
      mountPath,
      csr,
      commonName,
      '8760h',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.nodeCertificate.update({
        where: { nodeId: certificate.nodeId },
        data: { revokedAt: new Date() },
      });

      await this.vault.pki.revokeCertificate(
        mountPath,
        certificate.serialNumber,
      );

      await tx.nodeCertificate.create({
        data: {
          nodeId: node.id,
          serialNumber: newCert.serial_number.replace(/:/g, ''),
          issuedAt: new Date(),
          expiresAt: new Date(newCert.expiration * 1000),
          revokedAt: null,
        },
      });
    });

    return {
      certificate: newCert.certificate,
      issuing_ca: newCert.issuing_ca,
      ca_chain: newCert.ca_chain,
      serial_number: newCert.serial_number,
      expiration: newCert.expiration,
    };
  }
}
