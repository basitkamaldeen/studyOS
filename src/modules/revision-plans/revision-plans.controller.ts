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
import { RevisionPlansService } from './revision-plans.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateRevisionPlanDto,
  UpdateRevisionPlanDto,
  GeneratePlanDto,
  AddTaskDto,
  GetPlansQueryDto,
  StudyReportQueryDto,
} from './dto/revision-plan.dto';

@Controller('revision-plans')
@UseGuards(AuthGuard('jwt'))
export class RevisionPlansController {
  constructor(private readonly revisionPlansService: RevisionPlansService) {}

  // ==================== PLAN CRUD ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRevisionPlanDto,
  ) {
    return this.revisionPlansService.createPlan(userId, dto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generatePlan(
    @CurrentUser('id') userId: string,
    @Body() dto: GeneratePlanDto,
  ) {
    return this.revisionPlansService.generatePlan(userId, dto);
  }

  @Get()
  async getUserPlans(
    @CurrentUser('id') userId: string,
    @Query() query: GetPlansQueryDto,
  ) {
    return this.revisionPlansService.getUserPlans(userId, query.page, query.limit);
  }

  @Get(':id')
  async getPlanById(
    @CurrentUser('id') userId: string,
    @Param('id') planId: string,
  ) {
    return this.revisionPlansService.getPlanById(userId, planId);
  }

  @Put(':id')
  async updatePlan(
    @CurrentUser('id') userId: string,
    @Param('id') planId: string,
    @Body() dto: UpdateRevisionPlanDto,
  ) {
    return this.revisionPlansService.updatePlan(userId, planId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePlan(
    @CurrentUser('id') userId: string,
    @Param('id') planId: string,
  ) {
    return this.revisionPlansService.deletePlan(userId, planId);
  }

  // ==================== TASK MANAGEMENT ====================

  @Post(':planId/tasks')
  @HttpCode(HttpStatus.CREATED)
  async addTask(
    @Param('planId') planId: string,
    @Body() dto: AddTaskDto,
  ) {
    return this.revisionPlansService.addTask(planId, dto);
  }

  @Put('tasks/:taskId/complete')
  @HttpCode(HttpStatus.OK)
  async completeTask(
    @CurrentUser('id') userId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.revisionPlansService.completeTask(userId, taskId);
  }

  @Get(':planId/tasks')
  async getTasks(
    @CurrentUser('id') userId: string,
    @Param('planId') planId: string,
  ) {
    return this.revisionPlansService.getTasks(userId, planId);
  }

  // ==================== STUDY REPLAY / ANALYTICS ====================

  @Get('study-replay/overview')
  async getStudyReplayOverview(@CurrentUser('id') userId: string) {
    return this.revisionPlansService.getStudyReplayOverview(userId);
  }

  @Get('study-replay/daily')
  async getDailyReport(
    @CurrentUser('id') userId: string,
    @Query() query: StudyReportQueryDto,
  ) {
    const date = query.date ? new Date(query.date) : new Date();
    return this.revisionPlansService.getDailyReport(userId, date);
  }

  @Get('study-replay/weekly')
  async getWeeklyReport(
    @CurrentUser('id') userId: string,
    @Query('week') week: number,
    @Query('year') year: number,
  ) {
    const currentYear = year || new Date().getFullYear();
    const currentWeek = week || this.getCurrentWeekNumber();
    return this.revisionPlansService.getWeeklyReport(userId, currentWeek, currentYear);
  }

  @Get('study-replay/monthly')
  async getMonthlyReport(
    @CurrentUser('id') userId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    return this.revisionPlansService.getMonthlyReport(userId, currentMonth, currentYear);
  }

  private getCurrentWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }
}