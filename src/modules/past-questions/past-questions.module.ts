import { Module } from '@nestjs/common';
import { PastQuestionsService } from './past-questions.service';
import { PastQuestionsController } from './past-questions.controller';

@Module({
  controllers: [PastQuestionsController],
  providers: [PastQuestionsService],
  exports: [PastQuestionsService],
})
export class PastQuestionsModule {}