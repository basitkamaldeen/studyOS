import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { NotesModule } from './modules/notes/notes.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AiTutorModule } from './modules/ai-tutor/ai-tutor.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { VoiceModule } from './modules/voice/voice.module';
import { PastQuestionsModule } from './modules/past-questions/past-questions.module';
import { WeaknessMapModule } from './modules/weakness-map/weakness-map.module';
import { RevisionPlansModule } from './modules/revision-plans/revision-plans.module';
import { AiModule } from './modules/ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    NotesModule,
    AiModule,
    FlashcardsModule,
    QuizzesModule,
    UploadsModule,
    AiTutorModule,
    GamificationModule,
    VoiceModule,
    PastQuestionsModule,
    WeaknessMapModule,
    RevisionPlansModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}