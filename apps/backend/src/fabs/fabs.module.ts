import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { TrainingModule } from '../training/training.module';
import { AdminFabsController } from './controllers/fabs.controller';
import { FabsController } from './controllers/org-fabs.controller';
import { FabsService } from './fabs.service';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    ProjectsModule,
    forwardRef(() => TrainingModule),
  ],
  controllers: [FabsController, AdminFabsController],
  providers: [FabsService],
  exports: [FabsService],
})
export class FabsModule {}
