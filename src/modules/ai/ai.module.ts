import { Module } from '@nestjs/common';
import { AiFlashcardService } from './ai-flashcard.service';
import { AiQuizService } from './ai-quiz.service';

@Module({
  providers: [AiFlashcardService, AiQuizService],
  exports: [AiFlashcardService, AiQuizService],
})
export class AiModule {}