import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TrainingService } from '../training.service';

@ApiTags('training')
@ApiBearerAuth()
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}
}
