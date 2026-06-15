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
import { QuizzesService } from './quizzes.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateQuizDto,
  AddQuestionDto,
  SubmitQuizAttemptDto,
  GetQuizzesQueryDto,
  QuizAttemptQueryDto,
  GenerateQuizFromNoteDto,
  GenerateQuizFromTextDto,
} from './dto/quiz.dto';

@Controller('quizzes')
@UseGuards(AuthGuard('jwt'))
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuiz(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.createQuiz(userId, dto);
  }

  @Post('generate/note')
  @HttpCode(HttpStatus.CREATED)
  async generateFromNote(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateQuizFromNoteDto,
  ) {
    return this.quizzesService.generateFromNote(userId, dto);
  }

  @Post('generate/text')
  @HttpCode(HttpStatus.CREATED)
  async generateFromText(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateQuizFromTextDto,
  ) {
    return this.quizzesService.generateFromText(userId, dto);
  }

  @Post(':id/questions')
  @HttpCode(HttpStatus.CREATED)
  async addQuestion(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
    @Body() dto: AddQuestionDto,
  ) {
    return this.quizzesService.addQuestion(userId, quizId, dto);
  }

  @Get()
  async getQuizzes(
    @CurrentUser('id') userId: string,
    @Query() query: GetQuizzesQueryDto,
  ) {
    return this.quizzesService.getQuizzes(userId, query);
  }

  @Get('history')
  async getQuizHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.quizzesService.getQuizHistory(userId, page, limit);
  }

  @Get('analytics')
  async getQuizAnalytics(@CurrentUser('id') userId: string) {
    return this.quizzesService.getQuizAnalytics(userId);
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.quizzesService.getQuizStats(userId);
  }

  @Get(':id')
  async getQuizById(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
  ) {
    return this.quizzesService.getQuizById(userId, quizId);
  }

  @Post(':id/attempts')
  @HttpCode(HttpStatus.CREATED)
  async submitAttempt(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
    @Body() dto: SubmitQuizAttemptDto,
  ) {
    return this.quizzesService.submitAttempt(userId, quizId, dto);
  }

  @Get(':id/attempts')
  async getAttempts(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.quizzesService.getAttempts(userId, quizId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteQuiz(
    @CurrentUser('id') userId: string,
    @Param('id') quizId: string,
  ) {
    return this.quizzesService.deleteQuiz(userId, quizId);
  }
}