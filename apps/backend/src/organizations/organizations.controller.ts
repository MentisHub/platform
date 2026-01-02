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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ListOrganizationsQuery,
  PaginatedOrganizationsResponse,
} from '@platform/contracts';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import {
  CreateOrganizationDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
} from './organizations.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  @ApiCreatedResponse({
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.create(
      jwtPayload.sub,
      createOrganizationDto,
    );

    return OrganizationResponseDto.fromEntity(organization);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations' })
  @ApiOkResponse({
    description: 'Paginated list of organizations',
  })
  async findAll(
    @Query() query: ListOrganizationsQuery,
  ): Promise<PaginatedOrganizationsResponse> {
    const organizations = await this.organizationsService.findAll(query);

    return {
      data: organizations.data.map((org) =>
        OrganizationResponseDto.fromEntity(org),
      ),
      meta: organizations.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiOkResponse({
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<OrganizationResponseDto | null> {
    const organization = await this.organizationsService.findOne(id);
    if (!organization) return null;

    return OrganizationResponseDto.fromEntity(organization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiOkResponse({
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
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
  @ApiOperation({ summary: 'Delete an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiOkResponse({ description: 'Organization deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.organizationsService.remove(id);
  }
}
