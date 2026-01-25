import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VaultService } from '../../vault/vault.service';
import { uuidToBase32 } from '../../utils';
import { normalizeSerialNumber } from '../nodes.utils';

type NodeWithOrgAndCA = {
  id: string;
  metadata: Prisma.JsonValue;
  organization: {
    id: string;
    ca: {
      vaultMountPath: string;
    } | null;
  };
};

@Injectable()
export class NodeCertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
  ) {}

  async create(
    data: Prisma.NodeCertificateCreateInput,
    tx: Prisma.TransactionClient | null = null,
  ) {
    const prisma = tx ? tx : this.prisma;

    await prisma.nodeCertificate.create({
      data,
    });
  }

  async findOne(serialNumber: string) {
    const cert = await this.prisma.nodeCertificate.findFirst({
      where: {
        serialNumber: normalizeSerialNumber(serialNumber),
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

    if (!cert)
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid or revoked certificate',
      });

    return cert;
  }

  async update(
    nodeId: string,
    data: Prisma.NodeCertificateUpdateInput,
    tx: Prisma.TransactionClient | null = null,
  ) {
    const prisma = tx ? tx : this.prisma;

    await prisma.nodeCertificate.update({
      where: { nodeId },
      data,
    });
  }

  async findNodeCertificateFab(serialNumber: string) {
    const certificate = await this.prisma.nodeCertificate.findFirst({
      where: {
        serialNumber: normalizeSerialNumber(serialNumber),
        revokedAt: null,
      },
      include: {
        node: {
          include: {
            runParticipations: {
              include: {
                run: {
                  include: {
                    fab: {
                      include: {
                        organization: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!certificate || !certificate.node) {
      throw new NotFoundException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Certificate or node not found',
      });
    }

    const trainingRuns = certificate.node.runParticipations.map((rp) => rp.run);
    return {
      ...certificate,
      node: {
        ...certificate.node,
        trainingRuns,
      },
    };
  }

  async issueCertificate(node: NodeWithOrgAndCA, csr: string) {
    if (!node.organization.ca) {
      throw new NotFoundException({
        code: ErrorCode.ORG_CA_NOT_FOUND,
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

    const rootCa = await this.vault.pki.getRootCA();

    return {
      cert,
      rootCa,
      mountPath,
    };
  }

  async revokeCertificate(mountPath: string, serialNumber: string) {
    await this.vault.pki.revokeCertificate(mountPath, serialNumber);
  }
}
