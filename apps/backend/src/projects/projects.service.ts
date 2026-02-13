import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import type { Project } from '@prisma/client';
import { FlowerService } from '../flower/services/flower.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FlowerService))
    private readonly flowerService: FlowerService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        organizationId,
        trainingConfig: createProjectDto.trainingConfig ?? undefined,
      },
    });

    await this.flowerService.createFederation(project.id, project.name);

    return project;
  }

  async findAll(organizationId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.getProjectById(projectId);

    return this.prisma.project.update({
      where: { id: project.id },
      data: {
        ...(updateProjectDto.name !== undefined && {
          name: updateProjectDto.name,
        }),
        ...(updateProjectDto.trainingConfig !== undefined && {
          trainingConfig: updateProjectDto.trainingConfig ?? undefined,
        }),
      },
    });
  }

  async remove(projectId: string): Promise<void> {
    const project = await this.getProjectById(projectId);

    await this.prisma.project.delete({
      where: { id: project.id },
    });
  }

  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({
        code: ErrorCode.PROJECT_NOT_FOUND,
        message: 'Project not found',
      });
    }

    return project;
  }
}
