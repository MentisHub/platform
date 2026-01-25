import { Module } from '@nestjs/common';
import { FlowerService } from './flower.service';

@Module({
  providers: [FlowerService],
  exports: [FlowerService],
})
export class FlowerModule {}
