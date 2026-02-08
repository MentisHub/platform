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
import { ListOrganizationsQuery } from '@platform/contracts';
import { UserPayload } from 'src/authentication/decorators/user.decorator';
import { UserPayloadData } from 'src/authentication/interfaces/payload.interface';
import {
  CreateOrganizationDto,
  OrganizationResponseDto,
  PaginatedOrganizationsResponseDto,
  UpdateOrganizationDto,
} from './organizations.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create organization',
    description:
      'Creates a new organization with the authenticated user as owner',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @UserPayload() userPayload: UserPayloadData,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.create(
      userPayload.sub,
      createOrganizationDto,
    );

    return OrganizationResponseDto.fromEntity(organization);
  }

  @Get()
  @ApiOperation({
    summary: 'List organizations',
    description:
      'Retrieves a paginated list of organizations where the user is owner or member',
  })
  @ApiResponse({
    status: 200,
    description: 'List of organizations retrieved successfully',
    type: PaginatedOrganizationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query() query: ListOrganizationsQuery,
    @UserPayload() user: UserPayloadData,
  ): Promise<PaginatedOrganizationsResponseDto> {
    const organizations = await this.organizationsService.findAll(
      user.sub,
      query,
    );

    return {
      data: organizations.data.map((org) =>
        OrganizationResponseDto.fromEntity(org),
      ),
      meta: organizations.meta,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieves details of a specific organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<OrganizationResponseDto | null> {
    const organization = await this.organizationsService.findOne(id);
    if (!organization) return null;

    return OrganizationResponseDto.fromEntity(organization);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Updates organization details (partial update)',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
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
    status: 404,
    description: 'Organization not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.update(
      id,
      updateOrganizationDto,
    );

    return OrganizationResponseDto.fromEntity(organization);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Permanently deletes an organization and all its associated resources',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.organizationsService.remove(id);
  }
}
