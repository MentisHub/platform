import { Injectable } from '@nestjs/common';
import type {
  CreateOrganizationInput,
  ListOrganizationsQuery,
  UpdateOrganizationInput,
} from '@platform/contracts';
import type { Organization } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const slug = input.name.toLowerCase().replace(/\s+/g, '-');

    return this.prisma.organization.create({
      data: {
        name: input.name,
        slug,
        ownerId,
      },
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
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

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
    return await this.prisma.organization.findUnique({
      where: {
        id,
      },
    });
  }

  async update(
    id: string,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    const slug = input.name
      ? input.name.toLowerCase().replace(/\s+/g, '-')
      : undefined;

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: input.name,
        slug,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.organization.delete({
      where: { id },
    });
  }
}
