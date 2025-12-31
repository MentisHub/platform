import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OrganizationMembership,
  ProjectMembership,
} from './interfaces/membership.interface';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrgMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | null> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        role: true,
        organization: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!membership) return null;

    return {
      organizationId,
      role: membership.role,
      isOwner: membership.organization.ownerId === userId,
    };
  }

  async getProjectMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMembership | null> {
    return await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: {
        projectId: true,
        role: true,
      },
    });
  }
}
