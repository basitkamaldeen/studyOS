import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PastQuestionsService } from './past-questions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SolveQuestionDto, UploadPastQuestionDto, GetHistoryQueryDto } from './dto/past-questions.dto';

@Controller('past-questions')
@UseGuards(AuthGuard('jwt'))
export class PastQuestionsController {
  constructor(private readonly pastQuestionsService: PastQuestionsService) {}

  @Post('solve')
  @HttpCode(HttpStatus.OK)
  async solveQuestion(
    @CurrentUser('id') userId: string,
    @Body() dto: SolveQuestionDto,
  ) {
    return this.pastQuestionsService.solveQuestion(userId, dto);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async uploadPastQuestion(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadPastQuestionDto,
  ) {
    return this.pastQuestionsService.uploadPastQuestion(userId, dto);
  }

  @Get('history')
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query() query: GetHistoryQueryDto,
  ) {
    return this.pastQuestionsService.getHistory(userId, query.page, query.limit);
  }

  @Get('analytics')
  async getAnalytics(@CurrentUser('id') userId: string) {
    return this.pastQuestionsService.getAnalytics(userId);
  }

  @Get(':id')
  async getEntryById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.pastQuestionsService.getEntryById(userId, id);
  }
}