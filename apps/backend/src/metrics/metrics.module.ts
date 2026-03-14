import { Module } from '@nestjs/common';
import { TrainingModule } from 'src/training/training.module';
import { ProjMetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [TrainingModule],
  providers: [MetricsService],
  controllers: [ProjMetricsController],
})
export class MetricsModule {}
