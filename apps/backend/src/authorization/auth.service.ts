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
        organization: { select: { ownerId: true } },
      },
    });

    if (!membership) return null;

    return {
      isOwner: membership?.organization.ownerId === userId,
      role: membership?.role,
    };
  }

  async getProjectMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMembership | null> {
    const directMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (directMember) {
      return {
        role: directMember.role,
      };
    }

    const orgMember = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        organization: {
          select: {
            members: {
              where: { userId },
              select: { role: true },
              take: 1,
            },
          },
        },
      },
    });

    const membership = orgMember?.organization.members[0];

    if (membership) {
      return {
        role: membership.role,
      };
    }

    return null;
  }
}
