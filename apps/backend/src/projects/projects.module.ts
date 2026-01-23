import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsService } from './projects.service';
import { OrgProjectsController } from './controllers/org-projects.controller';

@Module({
  imports: [PrismaModule],
  providers: [ProjectsService],
  exports: [ProjectsService],
  controllers: [OrgProjectsController],
})
export class ProjectsModule {}
