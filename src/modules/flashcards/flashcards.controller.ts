import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FlashcardsService } from './flashcards.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateFlashcardDto,
  UpdateFlashcardDto,
  ReviewFlashcardDto,
  AnswerFlashcardDto,
  GetFlashcardsQueryDto,
  DueFlashcardsQueryDto,
  GenerateFlashcardsFromNoteDto,
  GenerateFlashcardsFromTextDto,
} from './dto/flashcard.dto';

@Controller('flashcards')
@UseGuards(AuthGuard('jwt'))
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFlashcard(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFlashcardDto,
  ) {
    return this.flashcardsService.createFlashcard(userId, dto);
  }

  @Post('generate/note')
  @HttpCode(HttpStatus.CREATED)
  async generateFromNote(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateFlashcardsFromNoteDto,
  ) {
    return this.flashcardsService.generateFromNote(userId, dto);
  }

  @Post('generate/text')
  @HttpCode(HttpStatus.CREATED)
  async generateFromText(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateFlashcardsFromTextDto,
  ) {
    return this.flashcardsService.generateFromText(userId, dto);
  }

  @Get()
  async getFlashcards(
    @CurrentUser('id') userId: string,
    @Query() query: GetFlashcardsQueryDto,
  ) {
    return this.flashcardsService.getFlashcards(userId, query);
  }

  @Get('due')
  async getDueFlashcards(
    @CurrentUser('id') userId: string,
    @Query() query: DueFlashcardsQueryDto,
  ) {
    return this.flashcardsService.getDueFlashcards(userId, query.limit);
  }

  @Get('mastery')
  async getMasteryStats(@CurrentUser('id') userId: string) {
    return this.flashcardsService.getMasteryStats(userId);
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.flashcardsService.getReviewStats(userId);
  }

  @Get(':id')
  async getFlashcardById(
    @CurrentUser('id') userId: string,
    @Param('id') flashcardId: string,
  ) {
    return this.flashcardsService.getFlashcardById(userId, flashcardId);
  }

  @Put(':id')
  async updateFlashcard(
    @CurrentUser('id') userId: string,
    @Param('id') flashcardId: string,
    @Body() dto: UpdateFlashcardDto,
  ) {
    return this.flashcardsService.updateFlashcard(userId, flashcardId, dto);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async reviewFlashcard(
    @CurrentUser('id') userId: string,
    @Param('id') flashcardId: string,
    @Body() dto: ReviewFlashcardDto,
  ) {
    return this.flashcardsService.reviewFlashcard(userId, flashcardId, dto);
  }

  @Post(':id/answer')
  @HttpCode(HttpStatus.OK)
  async answerFlashcard(
    @CurrentUser('id') userId: string,
    @Param('id') flashcardId: string,
    @Body() dto: AnswerFlashcardDto,
  ) {
    return this.flashcardsService.answerFlashcard(userId, flashcardId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFlashcard(
    @CurrentUser('id') userId: string,
    @Param('id') flashcardId: string,
  ) {
    return this.flashcardsService.deleteFlashcard(userId, flashcardId);
  }
}