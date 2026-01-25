import { Module, forwardRef } from '@nestjs/common';
import { NodesModule } from '../nodes/nodes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminFabsController } from './controllers/fabs.controller';
import { FabsController } from './controllers/org-fabs.controller';
import { FabsService } from './fabs.service';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    ProjectsModule,
    forwardRef(() => NodesModule),
  ],
  controllers: [FabsController, AdminFabsController],
  providers: [FabsService],
  exports: [FabsService],
})
export class FabsModule {}
