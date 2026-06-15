import { Controller, Get, Post, Query, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamificationService } from './gamification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeaderboardQueryDto, AwardXpDto } from './dto/gamification.dto';

@Controller('gamification')
@UseGuards(AuthGuard('jwt'))
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // XP Endpoints
  @Get('xp')
  async getUserXP(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUserXP(userId);
  }

  @Get('xp/history')
  async getXPHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.gamificationService.getXPHistory(userId, limit);
  }

  @Post('xp/award')
  async awardXP(
    @CurrentUser('id') userId: string,
    @Body() dto: AwardXpDto,
  ) {
    return this.gamificationService.awardXP(userId, dto);
  }

  // Rank Endpoints
  @Get('rank')
  async getUserRank(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUserRankAndXP(userId);
  }

  // Streak Endpoints
  @Get('streaks')
  async getStreak(@CurrentUser('id') userId: string) {
    return this.gamificationService.getStreak(userId);
  }

  @Post('streaks/check-in')
  async checkIn(@CurrentUser('id') userId: string) {
    return this.gamificationService.checkIn(userId);
  }

  @Get('streaks/history')
  async getStreakHistory(@CurrentUser('id') userId: string) {
    return this.gamificationService.getStreakHistory(userId);
  }

  // Achievement Endpoints
  @Get('achievements')
  async getAchievements(@CurrentUser('id') userId: string) {
    return this.gamificationService.getAchievements(userId);
  }

  @Get('achievements/unlocked')
  async getUnlockedAchievements(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUnlockedAchievements(userId);
  }

  @Get('achievements/progress')
  async getAchievementProgress(@CurrentUser('id') userId: string) {
    return this.gamificationService.getAchievementProgress(userId);
  }

  @Post('achievements/check')
  async checkAchievements(@CurrentUser('id') userId: string) {
    return this.gamificationService.checkAchievements(userId);
  }

  // Leaderboard Endpoints
  @Get('leaderboard')
  async getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.gamificationService.getLeaderboard(query);
  }

  @Get('leaderboard/weekly')
  async getWeeklyLeaderboard(@Query('limit') limit: number = 50) {
    return this.gamificationService.getWeeklyLeaderboard(limit);
  }

  @Get('leaderboard/me')
  async getUserLeaderboardRank(
    @CurrentUser('id') userId: string,
    @Query('period') period: string = 'all',
  ) {
    return this.gamificationService.getUserLeaderboardRank(userId, period);
  }

  @Get('leaderboard/nearby')
  async getNearbyRanks(
    @CurrentUser('id') userId: string,
    @Query('period') period: string = 'all',
    @Query('range') range: number = 5,
  ) {
    return this.gamificationService.getNearbyRanks(userId, period, range);
  }

  @Post('sync')
  async syncLeaderboard(@CurrentUser('id') userId: string) {
    await this.gamificationService.updateLeaderboard(userId);
    return { message: 'Leaderboard synced successfully' };
  }
}