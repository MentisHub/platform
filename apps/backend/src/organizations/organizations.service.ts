import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateOrganizationInput,
  ListOrganizationsQuery,
  UpdateOrganizationInput,
} from '@platform/contracts';
import { ErrorCode } from '@platform/contracts';
import type { Organization } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { uuidToBase32 } from '../utils';
import type {
  PKIIntermediateGenerateResponse,
  PKISignIntermediateResponse,
} from '../vault/types/pki';
import { VaultService } from '../vault/vault.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly config: ConfigService,
  ) {}

  async create(
    ownerId: string,
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    let mountPath: string | null = null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: input.name,
            ownerId,
          },
        });

        mountPath = `pki_org_${uuidToBase32(organization.id)}`;
        const vaultAddr = this.config.getOrThrow<string>('VAULT_ADDR');

        try {
          await this.vault.pki.mountPKI(mountPath, '43800h');
        } catch (error) {
          throw new Error(
            `Failed to mount PKI in Vault: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        const commonName = `${organization.name} Intermediate CA`;
        let csrData: PKIIntermediateGenerateResponse;

        try {
          csrData = await this.vault.pki.generateIntermediate(
            mountPath,
            commonName,
            '43800h',
          );
        } catch (error) {
          throw new Error(
            `Failed to generate intermediate CA: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        let signedCert: PKISignIntermediateResponse;
        try {
          signedCert = await this.vault.pki.signIntermediate(
            csrData.csr,
            commonName,
            '43800h',
          );
        } catch (error) {
          throw new Error(
            `Failed to sign intermediate CA: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        try {
          await this.vault.pki.setSignedIntermediate(
            mountPath,
            signedCert.certificate,
          );
        } catch (error) {
          throw new Error(
            `Failed to set signed intermediate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        try {
          await this.vault.pki.configureUrls(
            mountPath,
            `${vaultAddr}/v1/${mountPath}/ca`,
            `${vaultAddr}/v1/${mountPath}/crl`,
          );
        } catch (error) {
          throw new Error(
            `Failed to configure URLs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        const orgIdBase32 = uuidToBase32(organization.id);
        const certDomain =
          this.config.get<string>('CERT_DOMAIN') || 'localhost';

        try {
          await this.vault.pki.createRole(mountPath, 'node-cert', {
            allowed_domains: [
              `${orgIdBase32}.nodes.local`,
              `${orgIdBase32}.nodes.${certDomain}`,
              certDomain,
            ],
            allow_subdomains: true,
            max_ttl: '8760h',
            key_bits: 2048,
            key_type: 'rsa',
            require_cn: true,
          });
        } catch (error) {
          throw new Error(
            `Failed to create Vault role: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        await tx.organizationCA.create({
          data: {
            organizationId: organization.id,
            vaultMountPath: mountPath,
          },
        });

        return organization;
      });
    } catch (error) {
      if (mountPath) {
        try {
          await this.vault.pki.unmountPKI(mountPath);
        } catch (cleanupError) {
          const errorMsg =
            cleanupError instanceof Error
              ? cleanupError.message
              : 'Unknown error';

          console.error(`Failed to cleanup Vault mount: ${errorMsg}`);
        }
      }

      throw error;
    }
  }

  async findAll(userId: string, input: ListOrganizationsQuery) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      search,
    } = input;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id,
      },
    });

    if (!organization) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    return organization;
  }

  async update(
    id: string,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    await this.findOne(id);

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: input.name,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.organization.delete({
      where: { id },
    });
  }
}
