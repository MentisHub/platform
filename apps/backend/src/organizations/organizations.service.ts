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
    return await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.name,
          ownerId,
        },
      });

      const mountPath = `pki_org_${uuidToBase32(organization.id)}`;
      const vaultAddr = this.config.getOrThrow<string>('VAULT_ADDR');

      await this.vault.pki.mountPKI(mountPath, '43800h');

      const commonName = `${organization.name} Intermediate CA`;
      const csrData = await this.vault.pki.generateIntermediate(
        mountPath,
        commonName,
        '43800h',
      );

      const signedCert = await this.vault.pki.signIntermediate(
        csrData.csr,
        commonName,
        '43800h',
      );

      await this.vault.pki.setSignedIntermediate(
        mountPath,
        signedCert.certificate,
      );

      await this.vault.pki.configureUrls(
        mountPath,
        `${vaultAddr}/v1/${mountPath}/ca`,
        `${vaultAddr}/v1/${mountPath}/crl`,
      );

      const orgIdBase32 = uuidToBase32(organization.id);
      const certDomain = this.config.get<string>('CERT_DOMAIN') || 'localhost';

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

      await tx.organizationCA.create({
        data: {
          organizationId: organization.id,
          vaultMountPath: mountPath,
        },
      });

      return organization;
    });
  }

  async findAll(input: ListOrganizationsQuery) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      search,
    } = input;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: { contains: search, mode: 'insensitive' as const },
          deletedAt: null,
        }
      : { deletedAt: null };

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
        deletedAt: null,
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

    await this.prisma.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
