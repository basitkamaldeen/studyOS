import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRevisionPlanDto, UpdateRevisionPlanDto, GeneratePlanDto, AddTaskDto } from './dto/revision-plan.dto';

@Injectable()
export class RevisionPlansService {
  private readonly logger = new Logger(RevisionPlansService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== CORE CRUD OPERATIONS ====================

  async createPlan(userId: string, dto: CreateRevisionPlanDto) {
    const plan = await this.prisma.revisionPlan.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        targetExam: dto.targetExam,
        examDate: dto.examDate,
      },
    });
    return plan;
  }

  async getUserPlans(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [plans, total] = await Promise.all([
      this.prisma.revisionPlan.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tasks: {
            where: { completed: false },
            orderBy: { dueDate: 'asc' },
            take: 5,
          },
          _count: {
            select: { tasks: true },
          },
        },
      }),
      this.prisma.revisionPlan.count({ where: { userId, isActive: true } }),
    ]);

    return {
      data: plans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPlanById(userId: string, planId: string) {
    const plan = await this.prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
      include: {
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Revision plan not found');
    }

    return plan;
  }

  async updatePlan(userId: string, planId: string, dto: UpdateRevisionPlanDto) {
    const plan = await this.prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Revision plan not found');
    }

    return this.prisma.revisionPlan.update({
      where: { id: planId },
      data: dto,
    });
  }

  async deletePlan(userId: string, planId: string) {
    const plan = await this.prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Revision plan not found');
    }

    await this.prisma.revisionPlan.delete({
      where: { id: planId },
    });

    return { message: 'Revision plan deleted successfully' };
  }

  // ==================== TASK MANAGEMENT ====================

  async addTask(planId: string, dto: AddTaskDto) {
    const plan = await this.prisma.revisionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Revision plan not found');
    }

    const task = await this.prisma.revisionTask.create({
      data: {
        planId,
        topic: dto.topic,
        dueDate: dto.dueDate,
      },
    });
    return task;
  }

  async completeTask(userId: string, taskId: string) {
    const task = await this.prisma.revisionTask.findFirst({
      where: { id: taskId, plan: { userId } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.revisionTask.update({
      where: { id: taskId },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  async getTasks(userId: string, planId: string) {
    const plan = await this.prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Revision plan not found');
    }

    return this.prisma.revisionTask.findMany({
      where: { planId },
      orderBy: { dueDate: 'asc' },
    });
  }

  // ==================== AI PLAN GENERATION ====================

  async generatePlan(userId: string, dto: GeneratePlanDto) {
    const today = new Date();
    const examDate = new Date(dto.examDate);
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExam <= 0) {
      throw new Error('Exam date must be in the future');
    }

    const plan = await this.prisma.revisionPlan.create({
      data: {
        userId,
        title: `Exam Prep - ${examDate.toLocaleDateString()}`,
        description: `Personalized study plan for ${dto.subjects.join(', ')} over ${daysUntilExam} days`,
        targetExam: dto.subjects.join(', '),
        examDate,
      },
    });

    const tasks = [];
    const daysPerSubject = Math.floor(daysUntilExam / dto.subjects.length);
    
    for (let i = 0; i < dto.subjects.length; i++) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + (i * daysPerSubject));
      
      const task = await this.prisma.revisionTask.create({
        data: {
          planId: plan.id,
          topic: dto.subjects[i],
          dueDate,
        },
      });
      tasks.push(task);
    }

    // Add review days
    const reviewDate = new Date(today);
    reviewDate.setDate(today.getDate() + Math.floor(daysUntilExam * 0.7));
    const reviewTask = await this.prisma.revisionTask.create({
      data: {
        planId: plan.id,
        topic: 'Comprehensive Review',
        dueDate: reviewDate,
      },
    });
    tasks.push(reviewTask);

    return {
      plan,
      tasks,
      daysUntilExam,
      recommendation: daysUntilExam < 30 
        ? 'Intensive study recommended. Focus on high-yield topics.' 
        : 'Balanced study plan. Maintain consistent daily progress.',
      studySchedule: this.generateStudySchedule(daysUntilExam, dto.subjects.length),
    };
  }

  private generateStudySchedule(daysUntilExam: number, subjectCount: number) {
    const schedule = [];
    const dailyHours = daysUntilExam < 30 ? 4 : 2;
    const hoursPerSubject = Math.floor(dailyHours / subjectCount);

    for (let i = 0; i < Math.min(daysUntilExam, 14); i++) {
      schedule.push({
        day: i + 1,
        hours: dailyHours,
        breakdown: `Study ${hoursPerSubject} hours per subject`,
      });
    }

    return {
      dailyHours,
      weeklyHours: dailyHours * 7,
      totalHours: dailyHours * daysUntilExam,
      sample: schedule,
    };
  }

  // ==================== STUDY REPLAY / ANALYTICS ====================

  async getStudyReplayOverview(userId: string) {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    const [weekly, monthly, yearly, allTime] = await Promise.all([
      this.getStudyStats(userId, weekAgo, new Date()),
      this.getStudyStats(userId, monthAgo, new Date()),
      this.getStudyStats(userId, yearAgo, new Date()),
      this.getStudyStats(userId, new Date(0), new Date()),
    ]);

    // Get daily activity for the last 7 days
    const dailyActivity = await this.getDailyActivity(userId, 7);

    return {
      weekly,
      monthly,
      yearly,
      allTime,
      dailyActivity,
    };
  }

  async getDailyReport(userId: string, date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const stats = await this.getStudyStats(userId, startDate, endDate);
    const hourlyBreakdown = await this.getHourlyBreakdown(userId, startDate, endDate);
    
    return {
      ...stats,
      hourlyBreakdown,
      tips: this.getDailyTips(stats),
    };
  }

  async getWeeklyReport(userId: string, week: number, year: number) {
    const startDate = this.getDateOfISOWeek(week, year);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const stats = await this.getStudyStats(userId, startDate, endDate);
    const dailyBreakdown = await this.getDailyBreakdown(userId, startDate, endDate);
    
    return {
      ...stats,
      weekNumber: week,
      year,
      dailyBreakdown,
      comparison: await this.getWeekComparison(userId, week, year),
    };
  }

  async getMonthlyReport(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const stats = await this.getStudyStats(userId, startDate, endDate);
    const weeklyBreakdown = await this.getWeeklyBreakdown(userId, startDate, endDate);
    
    return {
      ...stats,
      month,
      year,
      weeklyBreakdown,
      monthlyTrend: await this.getMonthlyTrend(userId, month, year),
    };
  }

  // ==================== HELPER METHODS ====================

  private async getStudyStats(userId: string, startDate: Date, endDate: Date) {
    const [quizAttempts, flashcardReviews, notes, studySessions, xpGained] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { userId, completedAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.flashcardReview.findMany({
        where: { userId, reviewedAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.note.count({
        where: { userId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.studySession.findMany({
        where: { userId, startTime: { gte: startDate, lte: endDate } },
      }),
      this.prisma.xPLog.aggregate({
        where: { userId, createdAt: { gte: startDate, lte: endDate } },
        _sum: { xpEarned: true },
      }),
    ]);

    const totalQuestions = quizAttempts.reduce((sum, a) => sum + (a.maxScore || 0), 0);
    const correctAnswers = quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const totalStudySeconds = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      quizzesCompleted: quizAttempts.length,
      flashcardsReviewed: flashcardReviews.length,
      notesCreated: notes,
      studyHours: Math.round(totalStudySeconds / 3600),
      studyMinutes: Math.round((totalStudySeconds % 3600) / 60),
      accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      xpEarned: xpGained._sum.xpEarned || 0,
      totalSessions: studySessions.length,
    };
  }

  private async getDailyActivity(userId: string, days: number) {
    const activity = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const stats = await this.getStudyStats(userId, date, nextDate);
      activity.push({
        date: date.toISOString().split('T')[0],
        ...stats,
      });
    }
    
    return activity;
  }

  private async getHourlyBreakdown(userId: string, startDate: Date, endDate: Date) {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId, startTime: { gte: startDate, lte: endDate } },
    });
    
    const hourlyBreakdown: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyBreakdown[i] = 0;
    }
    
    for (const session of sessions) {
      const hour = new Date(session.startTime).getHours();
      hourlyBreakdown[hour] += (session.duration || 0) / 3600;
    }
    
    return hourlyBreakdown;
  }

  private async getDailyBreakdown(userId: string, startDate: Date, endDate: Date) {
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const stats = await this.getStudyStats(userId, currentDate, dayEnd);
      days.push({
        date: currentDate.toISOString().split('T')[0],
        ...stats,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  private async getWeeklyBreakdown(userId: string, startDate: Date, endDate: Date) {
    const weeks = [];
    let currentStart = new Date(startDate);
    
    while (currentStart <= endDate) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + 6);
      
      const stats = await this.getStudyStats(userId, currentStart, currentEnd);
      weeks.push({
        weekStart: currentStart.toISOString().split('T')[0],
        weekEnd: currentEnd.toISOString().split('T')[0],
        ...stats,
      });
      
      currentStart.setDate(currentStart.getDate() + 7);
    }
    
    return weeks;
  }

  private async getWeekComparison(userId: string, week: number, year: number) {
    const currentWeekStats = await this.getWeeklyReport(userId, week, year);
    
    const previousWeekStats = week > 1 
      ? await this.getWeeklyReport(userId, week - 1, year)
      : await this.getWeeklyReport(userId, 52, year - 1);
    
    return {
      studyHoursChange: ((currentWeekStats.studyHours - previousWeekStats.studyHours) / (previousWeekStats.studyHours || 1)) * 100,
      accuracyChange: currentWeekStats.accuracy - previousWeekStats.accuracy,
      quizzesChange: ((currentWeekStats.quizzesCompleted - previousWeekStats.quizzesCompleted) / (previousWeekStats.quizzesCompleted || 1)) * 100,
    };
  }

  private async getMonthlyTrend(userId: string, month: number, year: number) {
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      let targetMonth = month - i;
      let targetYear = year;
      if (targetMonth <= 0) {
        targetMonth += 12;
        targetYear--;
      }
      
      const stats = await this.getMonthlyReport(userId, targetMonth, targetYear);
      trends.push({
        month: targetMonth,
        year: targetYear,
        studyHours: stats.studyHours,
        accuracy: stats.accuracy,
      });
    }
    return trends;
  }

  private getDateOfISOWeek(week: number, year: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOWeekStart = simple;
    if (dow <= 4) {
      ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOWeekStart;
  }

  private getDailyTips(stats: any): string[] {
    const tips = [];
    
    if (stats.studyHours === 0) {
      tips.push("📚 You haven't studied today. Start with a 25-minute Pomodoro session!");
    } else if (stats.studyHours < 1) {
      tips.push("⏰ Great start! Try to maintain a consistent daily study habit.");
    } else if (stats.studyHours >= 4) {
      tips.push("💪 Excellent focus! Remember to take breaks to maintain productivity.");
    }
    
    if (stats.accuracy < 60 && stats.quizzesCompleted > 0) {
      tips.push("🎯 Review incorrect answers and focus on weak topics.");
    } else if (stats.accuracy >= 90 && stats.quizzesCompleted > 0) {
      tips.push("🏆 Outstanding performance! Challenge yourself with harder questions.");
    }
    
    if (tips.length === 0) {
      tips.push("✨ Keep up the momentum! Consistent small steps lead to big results.");
    }
    
    return tips;
  }
}