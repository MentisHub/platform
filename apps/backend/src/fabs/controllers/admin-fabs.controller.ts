import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import { FabResponseDto, UploadDefaultFabDto } from '../fabs.dto';
import { FabsService } from '../fabs.service';

@ApiTags('admin/fabs')
@ApiBearerAuth()
@Controller('admin/fabs')
export class AdminFabsController {
  constructor(private readonly fabsService: FabsService) {}

  @Post('default')
  @ApiOperation({ summary: 'Upload a default FAB (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: { type: 'string' },
        description: { type: 'string' },
        fabHash: { type: 'string' },
        version: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
      required: ['file', 'name', 'fabHash', 'version'],
    },
  })
  @ApiCreatedResponse({
    description: 'Default FAB uploaded successfully',
    type: FabResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDefault(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDefaultFabDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.uploadDefaultFab(user.sub, dto, file);
    return FabResponseDto.fromEntity(fab);
  }
}
