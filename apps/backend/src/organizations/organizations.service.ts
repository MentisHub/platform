import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  CreateOrganizationInput,
  ListOrganizationsQuery,
  UpdateOrganizationInput,
} from '@platform/contracts';
import { ErrorCode } from '@platform/contracts';
import type { Organization } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  private readonly logger: Logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const organization = await this.prisma.organization.create({
      data: {
        name: input.name,
        ownerId,
      },
    });

    this.logger.log(
      {
        action: 'organization.created',
        organizationId: organization.id,
        organizationName: organization.name,
        ownerId,
      },
      'Organization created',
    );

    return organization;
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
    const organization = await this.findOne(id);

    await this.prisma.organization.delete({
      where: { id },
    });

    this.logger.log(
      {
        action: 'organization.deleted',
        organizationId: id,
        organizationName: organization.name,
      },
      'Organization deleted',
    );
  }
}
