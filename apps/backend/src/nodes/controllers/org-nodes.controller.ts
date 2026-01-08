import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import {
  CreateNodeDto,
  CreateNodeResponseDto,
  ListNodesQueryDto,
  NodeResponseDto,
  UpdateNodeDto,
} from '../nodes.dto';
import { NodesService } from '../nodes.service';
import { RequireOrgRole } from 'src/authorization/decorators/roles.decorator';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';

@ApiTags('Organization Nodes')
@ApiBearerAuth()
@Controller('organizations/:organizationId/nodes')
export class OrgNodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post()
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Create a new node in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() createNodeDto: CreateNodeDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<CreateNodeResponseDto> {
    const { node, psk } = await this.nodesService.create(
      organizationId,
      jwtPayload.sub,
      createNodeDto,
    );

    return CreateNodeResponseDto.fromEntityWithPSK(node, psk);
  }

  @Get()
  @RequireOrgRole(OrgRole.MEMBER)
  @ApiOperation({ summary: 'List all nodes in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async findAll(
    @Param('organizationId') organizationId: string,
    @Query() query: ListNodesQueryDto,
  ) {
    const { nodes, total } = await this.nodesService.findAll(
      organizationId,
      query,
    );

    return {
      data: nodes.map((node) => NodeResponseDto.fromEntity(node)),
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: Math.ceil(total / (query.limit || 10)),
      },
    };
  }

  @Patch(':nodeId')
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update a node' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  async update(
    @Param('organizationId') organizationId: string,
    @Param('nodeId') nodeId: string,
    @Body() updateNodeDto: UpdateNodeDto,
  ): Promise<NodeResponseDto> {
    const node = await this.nodesService.update(
      organizationId,
      nodeId,
      updateNodeDto,
    );
    return NodeResponseDto.fromEntity(node);
  }

  @Delete(':nodeId')
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Delete a node (soft delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  async remove(
    @Param('organizationId') organizationId: string,
    @Param('nodeId') nodeId: string,
  ): Promise<void> {
    await this.nodesService.remove(organizationId, nodeId);
  }
}
