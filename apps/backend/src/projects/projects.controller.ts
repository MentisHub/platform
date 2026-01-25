import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import { RequireOrgRole } from 'src/authorization/decorators/roles.decorator';
import {
  CreateProjectDto,
  ListProjectsQueryDto,
  PaginatedProjectsResponse,
  PaginatedProjectsResponseDto,
  ProjectResponseDto,
  UpdateProjectDto,
} from './projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('organizations/:organizationId/projects')
export class OrgProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({
    summary: 'Create project',
    description: 'Creates a new project within an organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(
      organizationId,
      user.sub,
      createProjectDto,
    );

    return ProjectResponseDto.fromEntity(project);
  }

  @Get()
  @RequireOrgRole(OrgRole.MEMBER)
  @ApiOperation({
    summary: 'List projects',
    description:
      'Retrieves a paginated list of projects within an organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of projects retrieved successfully',
    type: PaginatedProjectsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires MEMBER role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async findAll(
    @Param('organizationId') organizationId: string,
    @Query() query: ListProjectsQueryDto,
  ): Promise<PaginatedProjectsResponse> {
    const projects = await this.projectsService.findAll(organizationId);

    return {
      data: projects.map((project) => ProjectResponseDto.fromEntity(project)),
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        total: projects.length,
        totalPages: Math.ceil(projects.length / (query.limit ?? 10)),
      },
    };
  }

  @Get(':projectId')
  @RequireOrgRole(OrgRole.MEMBER)
  @ApiOperation({
    summary: 'Get project by ID',
    description: 'Retrieves details of a specific project',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Project found',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires MEMBER role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async findOne(
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.getProjectById(projectId);
    return ProjectResponseDto.fromEntity(project);
  }

  @Patch(':projectId')
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({
    summary: 'Update project',
    description: 'Updates project details (partial update)',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async update(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(
      projectId,
      updateProjectDto,
    );
    return ProjectResponseDto.fromEntity(project);
  }

  @Delete(':projectId')
  @RequireOrgRole(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project',
    description:
      'Permanently deletes a project and all its associated resources',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async remove(@Param('projectId') projectId: string): Promise<void> {
    await this.projectsService.remove(projectId);
  }
}
