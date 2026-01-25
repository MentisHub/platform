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
    const [membership, organization] = await Promise.all([
      this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        select: {
          role: true,
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { ownerId: true },
      }),
    ]);

    if (!organization) return null;

    const isOwner = organization.ownerId === userId;
    if (!membership && !isOwner) return null;

    return {
      organizationId,
      role: membership?.role,
      isOwner,
    };
  }

  async getProjectMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMembership | null> {
    return this.prisma.projectMember.findUnique({
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

  async getOrganizationIdByProject(projectId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    return project?.organizationId ?? null;
  }
}
