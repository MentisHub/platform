import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Node, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { FlowerService } from '../flower/flower.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
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
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly flowerService: FlowerService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: CreateNodeInput,
  ): Promise<{ node: Node; psk: string }> {
    if (input.projectId) {
      await this.projectsService.getProject(input.projectId, organizationId);
    }

    const { psk, hash } = generatePSKWithHash();

    const name = input.name || `node-${randomBytes(4).toString('hex')}`;

    const node = await this.prisma.node.create({
      data: {
        name,
        id: hash,
        type: 'SUPERNODE',
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
      await this.projectsService.getProject(input.projectId, organizationId);
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

  async bootstrap(
    psk: string,
    csr: string,
    ecPublicKey: string,
  ): Promise<BootstrapResponseDto> {
    this.logger.log(`Bootstrap request received for PSK: ${psk.substring(0, 20)}...`);
    
    const pskParts = psk.split('.');
    const actualPsk = pskParts.length === 2 ? pskParts[1] : psk;
    const pskHash = hashPSK(actualPsk);

    this.logger.debug(`PSK hash: ${pskHash}`);

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
      this.logger.error(`Node not found for PSK hash: ${pskHash}`);
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Node not found',
      });
    }

    this.logger.log(`Found node: ${node.id} (${node.name})`);

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

    this.logger.log(
      `Certificate signed - Serial: ${cert.serial_number}, CN: ${commonName}`,
    );

    await this.prisma.$transaction(async (tx) => {
      const flowerNodeId = await this.flowerService.registerNode(ecPublicKey);

      this.logger.debug(`Registered in Flower with node ID: ${flowerNodeId}`);

      await tx.nodeCertificate.create({
        data: {
          nodeId: node.id,
          serialNumber: cert.serial_number.replace(/:/g, ''),
          issuedAt: new Date(),
          expiresAt: new Date(cert.expiration * 1000),
          revokedAt: null,
        },
      });

      this.logger.log(
        `Created certificate record - Node: ${node.id}, Serial: ${cert.serial_number.replace(/:/g, '')}`,
      );

      await tx.node.update({
        where: { id: node.id },
        data: {
          ecPublicKey,
          metadata: {
            ...(node.metadata as object),
            flowerNodeId,
          },
        },
      });
    });

    // Get MentisHub Root CA for SuperLink connection validation
    const rootCa = await this.vault.pki.getRootCA();

    return {
      certificate: cert.certificate,
      issuing_ca: cert.issuing_ca,
      ca_chain: cert.ca_chain,
      serial_number: cert.serial_number,
      expiration: cert.expiration,
      mentishub_root_ca: rootCa,
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

    // Get MentisHub Root CA for SuperLink connection validation
    const rootCa = await this.vault.pki.getRootCA();

    return {
      certificate: newCert.certificate,
      issuing_ca: newCert.issuing_ca,
      ca_chain: newCert.ca_chain,
      serial_number: newCert.serial_number,
      expiration: newCert.expiration,
      mentishub_root_ca: rootCa,
    };
  }
}
