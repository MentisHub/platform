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
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserPayload } from 'src/authentication/decorators/user.decorator';
import { UserPayloadData } from 'src/authentication/interfaces/payload.interface';
import { FabResponseDto, UploadDefaultFabDto } from '../fabs.dto';
import { FabsService } from '../fabs.service';

@ApiTags('fabs')
@Controller('fabs')
export class AdminFabsController {
  constructor(private readonly fabsService: FabsService) {}

  @Post('default')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload default FAB',
    description:
      'Uploads a default federated learning application bundle (FAB) accessible to all organizations',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Default FAB uploaded successfully',
    type: FabResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'File upload or storage failed',
  })
  async uploadDefault(
    @UserPayload() user: UserPayloadData,
    @Body() dto: UploadDefaultFabDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.uploadDefaultFab({
      userId: user.sub,
      description: dto.description,
      isPublic: dto.isPublic,
      tags: dto.tags,
      fileBuffer: file.buffer,
      originalname: file.originalname,
      size: file.size,
    });
    return FabResponseDto.fromEntity(fab);
  }
}
