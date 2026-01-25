import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Node, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { DockerService } from '../../docker/docker.service';
import { FlowerService } from '../../flower/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import { RunParticipantService } from '../../training/services/run-participant.service';
import { generatePSKWithHash, hashPSK, uuidToBase32 } from '../../utils';
import type { PKIIssueCertificateResponse } from '../../vault/types/pki';
import { CreateNodeDto, ListNodesQueryDto, UpdateNodeDto } from '../nodes.dto';
import { NodeCertificateBundle } from '../nodes.interface';
import { NodeCertificateService } from './node-cert.service';

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    private readonly projectsService: ProjectsService,
    private readonly nodeCertService: NodeCertificateService,
    private readonly runParticipantService: RunParticipantService,
    @Inject(forwardRef(() => DockerService))
    private readonly dockerService: DockerService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: CreateNodeDto,
  ): Promise<{ node: Node; psk: string }> {
    if (input.projectId) {
      await this.projectsService.getProject(input.projectId, organizationId);
    }

    const { psk, hash } = generatePSKWithHash();
    const node = await this.prisma.node.create({
      data: {
        name: input.name || `node-${randomBytes(4).toString('hex')}`,
        id: hash,
        metadata: input.metadata,
        organizationId,
        projectId: input.projectId,
        createdById: userId,
      },
    });

    return { node, psk: `${uuidToBase32(organizationId)}.${psk}` };
  }

  async findAll(
    organizationId: string,
    input: ListNodesQueryDto,
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

  async findById(organizationId: string, nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findFirst({
      where: {
        id: nodeId,
        organizationId,
      },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    return node;
  }

  async update(
    organizationId: string,
    nodeId: string,
    input: UpdateNodeDto,
  ): Promise<Node> {
    const node = await this.findById(organizationId, nodeId);

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
    const node = await this.prisma.node.findFirst({
      where: {
        id: nodeId,
        organizationId,
      },
      include: {
        certificate: true,
        organization: {
          include: {
            ca: true,
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    const metadata = node.metadata as Record<string, unknown> | null;
    const containerName =
      metadata && typeof metadata.containerName === 'string'
        ? metadata.containerName
        : null;
    const flowerNodeId =
      metadata && typeof metadata.flowerNodeId === 'string'
        ? metadata.flowerNodeId
        : null;

    if (containerName) {
      try {
        await this.dockerService.stopSuperExecContainer(containerName);
      } catch (error) {
        this.logger.warn({
          message: 'Failed to stop Docker container',
          nodeId: node.id,
          containerName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (flowerNodeId) {
      try {
        await this.flowerService.deactivateNode(Number(flowerNodeId));
      } catch (error) {
        this.logger.warn({
          message: 'Failed to deactivate node from Flower',
          nodeId: node.id,
          flowerNodeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (node.certificate && node.organization.ca) {
      try {
        await this.nodeCertService.revokeCertificate(
          node.organization.ca.vaultMountPath,
          node.certificate.serialNumber,
        );
      } catch (error) {
        this.logger.warn({
          message: 'Failed to revoke certificate',
          nodeId: node.id,
          serialNumber: node.certificate.serialNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.prisma.node.delete({ where: { id: node.id } });
  }

  async updateNodeStatus(
    nodeId: string,
    newStatus: 'CREATED' | 'READY' | 'ACTIVE' | 'ERROR' | 'OFFLINE',
  ): Promise<Node> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, status: true, name: true },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    const updatedNode = await this.prisma.node.update({
      where: { id: nodeId },
      data: { status: newStatus },
    });

    return updatedNode;
  }

  async bootstrap(
    psk: string,
    csr: string,
    ecPublicKey: string,
  ): Promise<NodeCertificateBundle> {
    const pskParts = psk.split('.');
    const actualPsk = pskParts.length === 2 ? pskParts[1] : psk;
    const pskHash = hashPSK(actualPsk);

    const node = await this.prisma.node.findFirst({
      where: {
        id: pskHash,
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
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Node not found or PSK already in use',
      });
    }

    let cert: PKIIssueCertificateResponse;
    let rootCa: string;
    let mountPath: string | undefined;

    try {
      const certData = await this.nodeCertService.issueCertificate(node, csr);
      cert = certData.cert;
      rootCa = certData.rootCa;
      mountPath = certData.mountPath;
    } catch (error) {
      this.logger.error({
        message: 'Failed to issue certificate during bootstrap',
        nodeId: node.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    const trainingRunData =
      await this.runParticipantService.getActiveTrainingRunForNode(node.id);

    const serialNumber = cert.serial_number.replace(/:/g, '').toLowerCase();
    let flowerNodeId: string | undefined;

    try {
      await this.prisma.$transaction(async (tx) => {
        let newStatus: 'READY' | 'ACTIVE' = 'READY';

        if (trainingRunData && !trainingRunData.isServerApp) {
          try {
            flowerNodeId = await this.flowerService.registerNode(
              ecPublicKey,
              trainingRunData.runId,
            );
            newStatus = 'ACTIVE';
          } catch (error) {
            this.logger.error({
              message: 'Failed to register node with Flower',
              nodeId: node.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
          }
        }

        await this.nodeCertService.create(
          {
            node: { connect: { id: node.id } },
            serialNumber,
            issuedAt: new Date(),
            expiresAt: new Date(cert.expiration * 1000),
            revokedAt: null,
          },
          tx,
        );

        await tx.node.update({
          where: { id: node.id },
          data: {
            status: newStatus,
            ...(flowerNodeId && {
              metadata: {
                ...(node.metadata as object),
                flowerNodeId,
              },
            }),
          },
        });

        this.logger.log({
          message: 'Node bootstrap completed',
          nodeId: node.id,
          nodeName: node.name,
          status: newStatus,
          hasFlowerNodeId: !!flowerNodeId,
        });
      });
    } catch (error) {
      this.logger.error({
        message: 'Transaction failed during bootstrap, rolling back',
        nodeId: node.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      try {
        if (mountPath) {
          await this.nodeCertService.revokeCertificate(mountPath, serialNumber);
        }
      } catch (revokeError) {
        this.logger.error({
          message: 'Failed to revoke certificate during rollback',
          nodeId: node.id,
          error:
            revokeError instanceof Error
              ? revokeError.message
              : 'Unknown error',
        });
      }

      if (flowerNodeId) {
        try {
          await this.flowerService.deactivateNode(Number(flowerNodeId));
        } catch (deactivateError) {
          this.logger.error({
            message: 'Failed to deactivate Flower node during rollback',
            nodeId: node.id,
            error:
              deactivateError instanceof Error
                ? deactivateError.message
                : 'Unknown error',
          });
        }
      }

      throw error;
    }

    return {
      certificate: cert.certificate,
      issuingCa: cert.issuing_ca,
      caChain: cert.ca_chain,
      serialNumber: cert.serial_number,
      expiration: cert.expiration,
      rootCa,
    };
  }

  async renewCertificate(
    certificateSerial: string,
    csr: string,
  ): Promise<NodeCertificateBundle> {
    const certificate = await this.nodeCertService.findOne(certificateSerial);
    const node = certificate.node;

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    if (certificate.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Certificate expired. Please bootstrap the node again.',
      });
    }

    let cert: PKIIssueCertificateResponse;
    let rootCa: string;
    let mountPath: string;

    try {
      const certData = await this.nodeCertService.issueCertificate(node, csr);
      cert = certData.cert;
      rootCa = certData.rootCa;
      mountPath = certData.mountPath;
    } catch (error) {
      this.logger.error({
        message: 'Failed to issue new certificate during renewal',
        nodeId: node.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    const newSerialNumber = cert.serial_number.replace(/:/g, '');
    let certificateRevoked = false;

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.nodeCertService.update(
          certificate.nodeId,
          { revokedAt: new Date() },
          tx,
        );

        await this.nodeCertService.revokeCertificate(
          mountPath,
          certificate.serialNumber,
        );
        certificateRevoked = true;

        await this.nodeCertService.create(
          {
            node: { connect: { id: node.id } },
            serialNumber: newSerialNumber,
            issuedAt: new Date(),
            expiresAt: new Date(cert.expiration * 1000),
            revokedAt: null,
          },
          tx,
        );
      });
    } catch (error) {
      this.logger.error({
        message: 'Transaction failed during certificate renewal, rolling back',
        nodeId: node.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (certificateRevoked) {
        try {
          await this.nodeCertService.revokeCertificate(
            mountPath,
            newSerialNumber,
          );
        } catch (revokeError) {
          this.logger.error({
            message: 'Failed to revoke new certificate during rollback',
            nodeId: node.id,
            error:
              revokeError instanceof Error
                ? revokeError.message
                : 'Unknown error',
          });
        }
      }

      throw error;
    }

    return {
      certificate: cert.certificate,
      issuingCa: cert.issuing_ca,
      caChain: cert.ca_chain,
      serialNumber: cert.serial_number,
      expiration: cert.expiration,
      rootCa,
    };
  }
}
