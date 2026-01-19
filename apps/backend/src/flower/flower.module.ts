import { Module } from '@nestjs/common';
import { DockerModule } from '../docker/docker.module';
import { FlowerService } from './flower.service';

@Module({
  imports: [DockerModule],
  providers: [FlowerService],
  exports: [FlowerService],
})
export class FlowerModule {}
