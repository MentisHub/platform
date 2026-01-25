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
  CreateNodeDto,
  CreateNodeResponseDto,
  ListNodesQueryDto,
  NodeResponseDto,
  PaginatedNodesResponseDto,
  UpdateNodeDto,
} from '../nodes.dto';
import { NodesService } from '../services/nodes.service';

@ApiTags('nodes')
@ApiBearerAuth()
@Controller('organizations/:organizationId/nodes')
export class OrgNodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post()
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({
    summary: 'Create node',
    description:
      'Creates a new node within an organization and returns a one-time PSK for bootstrap',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Node created successfully with PSK',
    type: CreateNodeResponseDto,
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
  @ApiOperation({
    summary: 'List nodes',
    description:
      'Retrieves a paginated list of nodes within an organization with optional filters',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of nodes retrieved successfully',
    type: PaginatedNodesResponseDto,
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
    @Query() query: ListNodesQueryDto,
  ): Promise<PaginatedNodesResponseDto> {
    const { nodes, total } = await this.nodesService.findAll(
      organizationId,
      query,
    );

    return {
      data: nodes.map((node) => NodeResponseDto.fromEntity(node)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Patch(':nodeId')
  @RequireOrgRole(OrgRole.ADMIN)
  @ApiOperation({
    summary: 'Update node',
    description: 'Updates node details (partial update)',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'nodeId',
    description: 'Node UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Node updated successfully',
    type: NodeResponseDto,
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
    description: 'Node not found',
  })
  async update(
    @Param('nodeId') nodeId: string,
    @Body() updateNodeDto: UpdateNodeDto,
  ): Promise<NodeResponseDto> {
    const node = await this.nodesService.update(nodeId, updateNodeDto);
    return NodeResponseDto.fromEntity(node);
  }

  @Get(':nodeId')
  @RequireOrgRole(OrgRole.MEMBER)
  @ApiOperation({
    summary: 'Get node by ID',
    description: 'Retrieves details of a specific node',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'nodeId',
    description: 'Node UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Node found',
    type: NodeResponseDto,
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
    description: 'Node not found',
  })
  async findOne(@Param('nodeId') nodeId: string): Promise<NodeResponseDto> {
    const node = await this.nodesService.findById(nodeId);
    return NodeResponseDto.fromEntity(node);
  }

  @Delete(':nodeId')
  @RequireOrgRole(OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete node',
    description: 'Permanently deletes a node and revokes its certificates',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'nodeId',
    description: 'Node UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Node deleted successfully',
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
    description: 'Node not found',
  })
  async remove(@Param('nodeId') nodeId: string): Promise<void> {
    await this.nodesService.remove(nodeId);
  }
}
