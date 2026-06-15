import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RANKS, ACHIEVEMENTS, LeaderboardQueryDto, AwardXpDto } from './dto/gamification.dto';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== XP SYSTEM ====================

  async getUserXP(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, username: true, avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentRank = this.getRankByXP(user.xp);
    const nextRank = this.getNextRank(user.xp);
    const xpToNextRank = nextRank ? nextRank.minXp - user.xp : 0;

    return {
      userId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      totalXP: user.xp,
      currentRank: {
        name: currentRank.name,
        emoji: currentRank.emoji,
        color: currentRank.color,
      },
      nextRank: nextRank ? {
        name: nextRank.name,
        emoji: nextRank.emoji,
        xpRequired: nextRank.minXp,
        xpRemaining: xpToNextRank,
      } : null,
      xpProgress: user.xp - currentRank.minXp,
      xpProgressPercent: ((user.xp - currentRank.minXp) / (currentRank.maxXp - currentRank.minXp)) * 100,
    };
  }

  async getXPHistory(userId: string, limit: number = 50) {
    const logs = await this.prisma.xPLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
    }));

    const totalXPEarned = logs.reduce((sum, log) => sum + log.xpEarned, 0);
    const groupedByAction: Record<string, number> = {};

    for (const log of logs) {
      groupedByAction[log.action] = (groupedByAction[log.action] || 0) + log.xpEarned;
    }

    return {
      history: parsedLogs,
      summary: {
        totalXPEarned,
        totalActions: logs.length,
        groupedByAction,
      },
    };
  }

  async awardXP(userId: string, dto: AwardXpDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const xpLog = await this.prisma.xPLog.create({
      data: {
        userId,
        action: dto.action,
        xpEarned: dto.xpEarned,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : '{}',
      },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: dto.xpEarned },
        rank: this.getRankNameByXP(user.xp + dto.xpEarned),
      },
    });

    await this.updateLeaderboard(userId);

    return {
      message: `${dto.xpEarned} XP awarded for ${dto.action}`,
      totalXP: updatedUser.xp,
      newRank: updatedUser.rank,
      log: {
        ...xpLog,
        metadata: xpLog.metadata ? JSON.parse(xpLog.metadata) : {},
      },
    };
  }

  // ==================== STREAKS ====================

  async getStreak(userId: string) {
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });

    if (!streak) {
      throw new NotFoundException('Streak not found');
    }

    return streak;
  }

  async checkIn(userId: string) {
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });

    if (!streak) {
      throw new NotFoundException('Streak not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastStudyDate = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
    lastStudyDate?.setHours(0, 0, 0, 0);

    let newCurrentStreak = streak.currentStreak;
    let newLongestStreak = streak.longestStreak;

    if (lastStudyDate) {
      const dayDiff = Math.floor((today.getTime() - lastStudyDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 0) {
        return { message: 'Already checked in today', streak: streak };
      } else if (dayDiff === 1) {
        newCurrentStreak = streak.currentStreak + 1;
        if (newCurrentStreak > streak.longestStreak) {
          newLongestStreak = newCurrentStreak;
        }
      } else {
        newCurrentStreak = 1;
      }
    } else {
      newCurrentStreak = 1;
      newLongestStreak = 1;
    }

    const updatedStreak = await this.prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastStudyDate: today,
      },
    });

    await this.awardXP(userId, {
      action: 'daily_checkin',
      xpEarned: 10,
      metadata: { streak: newCurrentStreak },
    });

    await this.checkAndAwardAchievements(userId, 'study_streak', newCurrentStreak);

    return {
      message: `Day ${newCurrentStreak} streak!`,
      streak: updatedStreak,
      xpEarned: 10,
    };
  }

  async getStreakHistory(userId: string) {
    const logs = await this.prisma.xPLog.findMany({
      where: {
        userId,
        action: 'daily_checkin',
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return logs.map(log => ({
      date: log.createdAt,
      xpEarned: log.xpEarned,
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
    }));
  }

  // ==================== ACHIEVEMENTS ====================

  async getAchievements(userId: string) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const allAchievements = ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: userAchievements.some(ua => ua.achievement.name === ach.name),
      unlockedAt: userAchievements.find(ua => ua.achievement.name === ach.name)?.unlockedAt,
    }));

    const unlockedCount = allAchievements.filter(a => a.unlocked).length;
    const totalXPFromAchievements = allAchievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.xpReward, 0);

    return {
      achievements: allAchievements,
      stats: {
        unlocked: unlockedCount,
        total: allAchievements.length,
        progress: (unlockedCount / allAchievements.length) * 100,
        totalXPEarned: totalXPFromAchievements,
      },
    };
  }

  async getUnlockedAchievements(userId: string) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    return userAchievements.map(ua => ({
      ...ua.achievement,
      unlockedAt: ua.unlockedAt,
    }));
  }

  async getAchievementProgress(userId: string) {
    const stats = await this.getUserStats(userId);
    
    const progress = ACHIEVEMENTS.map(ach => {
      let current = 0;
      let required = ach.criteriaValue;
      
      switch (ach.criteriaType) {
        case 'quiz_complete':
          current = stats.totalQuizzes;
          break;
        case 'flashcard_review':
          current = stats.totalFlashcardReviews;
          break;
        case 'study_streak':
          current = stats.currentStreak;
          break;
        case 'note_created':
          current = stats.totalNotes;
          break;
        case 'questions_solved':
          current = stats.totalCorrectAnswers;
          break;
        case 'perfect_score':
          current = stats.perfectScores;
          break;
        case 'ai_conversation':
          current = stats.totalAIConversations;
          break;
        default:
          current = 0;
      }
      
      return {
        name: ach.name,
        criteriaType: ach.criteriaType,
        current,
        required,
        progress: Math.min(100, (current / required) * 100),
        unlocked: current >= required,
      };
    });
    
    return progress;
  }

  async checkAchievements(userId: string) {
    const stats = await this.getUserStats(userId);
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
    
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievement.name));
    const newlyUnlocked = [];

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.name)) continue;
      
      let achieved = false;
      
      switch (achievement.criteriaType) {
        case 'quiz_complete':
          achieved = stats.totalQuizzes >= achievement.criteriaValue;
          break;
        case 'flashcard_review':
          achieved = stats.totalFlashcardReviews >= achievement.criteriaValue;
          break;
        case 'study_streak':
          achieved = stats.currentStreak >= achievement.criteriaValue;
          break;
        case 'note_created':
          achieved = stats.totalNotes >= achievement.criteriaValue;
          break;
        case 'questions_solved':
          achieved = stats.totalCorrectAnswers >= achievement.criteriaValue;
          break;
        case 'perfect_score':
          achieved = stats.perfectScores >= achievement.criteriaValue;
          break;
        case 'ai_conversation':
          achieved = stats.totalAIConversations >= achievement.criteriaValue;
          break;
      }
      
      if (achieved) {
        await this.unlockAchievement(userId, achievement);
        newlyUnlocked.push(achievement);
      }
    }
    
    return {
      message: `Checked achievements. ${newlyUnlocked.length} newly unlocked.`,
      newlyUnlocked,
    };
  }

  // ==================== RANK METHODS ====================

  async getUserRankAndXP(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, rank: true, username: true, avatarUrl: true },
    });

    if (!user) return null;

    const currentRank = this.getRankByXP(user.xp);
    const nextRank = this.getNextRank(user.xp);
    const xpToNextRank = nextRank ? nextRank.minXp - user.xp : 0;
    const xpInCurrentRank = user.xp - currentRank.minXp;
    const xpNeededForCurrentRank = currentRank.maxXp - currentRank.minXp;

    return {
      currentRank: {
        name: currentRank.name,
        emoji: currentRank.emoji,
        color: currentRank.color,
        xpRequired: currentRank.minXp,
      },
      nextRank: nextRank ? {
        name: nextRank.name,
        emoji: nextRank.emoji,
        xpRequired: nextRank.minXp,
        xpRemaining: xpToNextRank,
      } : null,
      xp: user.xp,
      xpProgress: xpNeededForCurrentRank,
      xpProgressPercent: xpNeededForCurrentRank > 0 ? (xpInCurrentRank / xpNeededForCurrentRank) * 100 : 100,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };
  }

  // ==================== LEADERBOARDS ====================

  async getLeaderboard(query: LeaderboardQueryDto) {
    const { period = 'all', limit = 50, page = 1 } = query;
    const skip = (page - 1) * limit;

    let orderBy: any = {};
    if (period === 'weekly') {
      orderBy = { weeklyXP: 'desc' };
    } else if (period === 'monthly') {
      orderBy = { monthlyXP: 'desc' };
    } else {
      orderBy = { xp: 'desc' };
    }

    const [entries, total] = await Promise.all([
      this.prisma.leaderboardEntry.findMany({
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.leaderboardEntry.count(),
    ]);

    const data = entries.map((entry, index) => ({
      ...entry,
      rank: skip + index + 1,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        period,
      },
    };
  }

  async getWeeklyLeaderboard(limit: number = 50) {
    return this.getLeaderboard({ period: 'weekly', limit, page: 1 });
  }

  async getUserLeaderboardRank(userId: string, period: string = 'all') {
    let orderBy: any = {};
    if (period === 'weekly') {
      orderBy = { weeklyXP: 'desc' };
    } else if (period === 'monthly') {
      orderBy = { monthlyXP: 'desc' };
    } else {
      orderBy = { xp: 'desc' };
    }

    const allUsers = await this.prisma.leaderboardEntry.findMany({
      orderBy,
      select: { userId: true, xp: true, weeklyXP: true, monthlyXP: true, username: true, avatarUrl: true },
    });

    const rank = allUsers.findIndex(u => u.userId === userId) + 1;
    const total = allUsers.length;
    const userEntry = allUsers.find(u => u.userId === userId);

    return {
      rank,
      total,
      percentile: total > 0 ? ((total - rank) / total) * 100 : 0,
      user: userEntry || null,
    };
  }

  async getNearbyRanks(userId: string, period: string = 'all', range: number = 5) {
    const currentRank = await this.getUserLeaderboardRank(userId, period);
    const startRank = Math.max(1, currentRank.rank - range);
    const endRank = currentRank.rank + range;

    let orderBy: any = {};
    if (period === 'weekly') {
      orderBy = { weeklyXP: 'desc' };
    } else if (period === 'monthly') {
      orderBy = { monthlyXP: 'desc' };
    } else {
      orderBy = { xp: 'desc' };
    }

    const allUsers = await this.prisma.leaderboardEntry.findMany({
      orderBy,
      select: { userId: true, xp: true, weeklyXP: true, monthlyXP: true, username: true, avatarUrl: true, streak: true },
    });

    const nearby = allUsers
      .map((user, idx) => ({ ...user, rank: idx + 1 }))
      .filter(user => user.rank >= startRank && user.rank <= endRank);

    return {
      currentRank: currentRank.rank,
      nearby,
      period,
    };
  }

  // ==================== HELPER METHODS ====================

  async updateLeaderboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, username: true, avatarUrl: true },
    });

    if (!user) return;

    const weeklyXP = await this.getWeeklyXP(userId);
    const monthlyXP = await this.getMonthlyXP(userId);
    const streak = await this.getCurrentStreak(userId);
    const highestStreak = await this.getHighestStreak(userId);

    await this.prisma.leaderboardEntry.upsert({
      where: { userId },
      update: {
        xp: user.xp,
        weeklyXP,
        monthlyXP,
        username: user.username,
        avatarUrl: user.avatarUrl,
        streak,
        highestStreak,
      },
      create: {
        userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        xp: user.xp,
        weeklyXP,
        monthlyXP,
        streak,
        highestStreak,
      },
    });
  }

  async checkAndAwardAchievements(userId: string, action: string, value: number = 1) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievement.name));
    const achievementsToCheck = ACHIEVEMENTS.filter(a => a.criteriaType === action && !unlockedIds.has(a.name));

    const stats = await this.getUserStats(userId);
    const newlyUnlocked = [];

    for (const achievement of achievementsToCheck) {
      let achieved = false;

      switch (achievement.criteriaType) {
        case 'quiz_complete':
          achieved = stats.totalQuizzes >= achievement.criteriaValue;
          break;
        case 'flashcard_review':
          achieved = stats.totalFlashcardReviews >= achievement.criteriaValue;
          break;
        case 'study_streak':
          achieved = stats.currentStreak >= achievement.criteriaValue;
          break;
        case 'note_created':
          achieved = stats.totalNotes >= achievement.criteriaValue;
          break;
        case 'questions_solved':
          achieved = stats.totalCorrectAnswers >= achievement.criteriaValue;
          break;
        case 'perfect_score':
          achieved = stats.perfectScores >= achievement.criteriaValue;
          break;
        case 'ai_conversation':
          achieved = stats.totalAIConversations >= achievement.criteriaValue;
          break;
      }

      if (achieved) {
        await this.unlockAchievement(userId, achievement);
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  private async unlockAchievement(userId: string, achievement: any) {
    const existingAchievement = await this.prisma.achievement.findUnique({
      where: { name: achievement.name },
    });

    if (!existingAchievement) {
      this.logger.error(`Achievement not found: ${achievement.name}`);
      return;
    }

    const existing = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: existingAchievement.id,
        },
      },
    });

    if (existing) return;

    await this.prisma.userAchievement.create({
      data: {
        userId,
        achievementId: existingAchievement.id,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: achievement.xpReward } },
    });

    await this.prisma.xPLog.create({
      data: {
        userId,
        action: `achievement_unlocked:${achievement.name}`,
        xpEarned: achievement.xpReward,
        metadata: JSON.stringify({ achievement: achievement.name }),
      },
    });

    await this.updateLeaderboard(userId);
    this.logger.log(`User ${userId} unlocked achievement: ${achievement.name}`);
  }

  private async getUserStats(userId: string) {
    const [user, quizAttempts, flashcardReviews, notes, aiConversations, perfectScores] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { streak: true },
      }),
      this.prisma.quizAttempt.count({ where: { userId } }),
      this.prisma.flashcardReview.count({ where: { userId } }),
      this.prisma.note.count({ where: { userId } }),
      this.prisma.aIConversation.count({ where: { userId } }),
      this.prisma.quizAttempt.count({
        where: { userId, percentage: 100 },
      }),
    ]);

    const totalCorrectAnswers = await this.prisma.quizAnswer.count({
      where: {
        attempt: { userId },
        isCorrect: true,
      },
    });

    return {
      totalQuizzes: quizAttempts,
      totalFlashcardReviews: flashcardReviews,
      totalNotes: notes,
      totalAIConversations: aiConversations,
      totalCorrectAnswers,
      perfectScores,
      currentStreak: user?.streak?.currentStreak || 0,
    };
  }

  private async getWeeklyXP(userId: string): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const result = await this.prisma.xPLog.aggregate({
      where: {
        userId,
        createdAt: { gte: weekAgo },
      },
      _sum: { xpEarned: true },
    });

    return result._sum.xpEarned || 0;
  }

  private async getMonthlyXP(userId: string): Promise<number> {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const result = await this.prisma.xPLog.aggregate({
      where: {
        userId,
        createdAt: { gte: monthAgo },
      },
      _sum: { xpEarned: true },
    });

    return result._sum.xpEarned || 0;
  }

  private async getCurrentStreak(userId: string): Promise<number> {
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });
    return streak?.currentStreak || 0;
  }

  private async getHighestStreak(userId: string): Promise<number> {
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });
    return streak?.longestStreak || 0;
  }

  private getRankByXP(xp: number) {
    return RANKS.find(rank => xp >= rank.minXp && xp <= rank.maxXp) || RANKS[RANKS.length - 1];
  }

  private getNextRank(xp: number) {
    return RANKS.find(rank => xp < rank.minXp);
  }

  private getRankNameByXP(xp: number): string {
    const rank = this.getRankByXP(xp);
    return `${rank.emoji} ${rank.name}`;
  }
}