import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
