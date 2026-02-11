import { Module, forwardRef } from '@nestjs/common';
import { FlowerModule } from '../flower/flower.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsService } from './projects.service';
import { OrgProjectsController } from './projects.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => FlowerModule)],
  providers: [ProjectsService],
  exports: [ProjectsService],
  controllers: [OrgProjectsController],
})
export class ProjectsModule {}
