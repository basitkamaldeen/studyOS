import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VoiceService } from './voice.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TranscribeAudioDto, GenerateFromTranscriptDto, VoiceToStudyDto } from './dto/voice.dto';

@Controller('voice')
@UseGuards(AuthGuard('jwt'))
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  async transcribeAudio(
    @CurrentUser('id') userId: string,
    @Body() dto: TranscribeAudioDto,
  ) {
    return this.voiceService.transcribeAudio(userId, dto);
  }

  @Post('summary')
  @HttpCode(HttpStatus.OK)
  async generateSummary(
    @CurrentUser('id') userId: string,
    @Body() dto: VoiceToStudyDto,
  ) {
    return this.voiceService.generateSummary(userId, dto);
  }

  @Post('flashcards')
  @HttpCode(HttpStatus.CREATED)
  async generateFlashcards(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateFromTranscriptDto,
  ) {
    return this.voiceService.generateFlashcardsFromVoice(userId, dto);
  }

  @Post('quiz')
  @HttpCode(HttpStatus.CREATED)
  async generateQuiz(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateFromTranscriptDto,
  ) {
    return this.voiceService.generateQuizFromVoice(userId, dto);
  }

  @Post('key-concepts')
  @HttpCode(HttpStatus.OK)
  async extractKeyConcepts(
    @CurrentUser('id') userId: string,
    @Body() dto: VoiceToStudyDto,
  ) {
    return this.voiceService.extractKeyConcepts(userId, dto);
  }
}