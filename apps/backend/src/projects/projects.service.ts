import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import type { OrganizationCA, Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProject(
    projectId: string,
    organizationId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Project not found',
      });
    }

    return project;
  }

  async getProjectWithCA(
    projectId: string,
    organizationId: string,
  ): Promise<Project & { organization: { ca: OrganizationCA | null } }> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
      },
      include: {
        organization: {
          include: {
            ca: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Project not found',
      });
    }

    if (!project.organization.ca) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Organization CA not found',
      });
    }

    return project;
  }
}
