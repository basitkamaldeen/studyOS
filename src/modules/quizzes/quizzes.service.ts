import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiQuizService } from '../ai/ai-quiz.service';
import {
  CreateQuizDto,
  AddQuestionDto,
  SubmitQuizAttemptDto,
  GetQuizzesQueryDto,
  QuizAttemptQueryDto,
  GenerateQuizFromNoteDto,
  GenerateQuizFromTextDto,
} from './dto/quiz.dto';

export interface FormattedQuiz {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  topic: string | null;
  questionCount: number;
  timeLimit: number | null;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private prisma: PrismaService,
    private aiQuizService: AiQuizService,
  ) {}

  async createQuiz(userId: string, dto: CreateQuizDto): Promise<FormattedQuiz> {
    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        topic: dto.topic,
        timeLimit: dto.timeLimit,
        tags: '[]',
      },
    });

    return this.formatQuiz(quiz);
  }

  async generateFromNote(userId: string, dto: GenerateQuizFromNoteDto) {
    const note = await this.prisma.note.findFirst({
      where: { id: dto.noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const generatedQuestions = await this.aiQuizService.generateQuizFromNote(
      note.title,
      note.content,
      dto.numberOfQuestions,
    );

    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        title: `Quiz: ${note.title}`,
        description: `Generated from note "${note.title}"`,
        topic: note.title.substring(0, 50),
        source: 'from-note',
        sourceId: note.id,
        questionCount: generatedQuestions.length,
        tags: JSON.stringify(['generated', 'from-note']),
      },
    });

    const questions: any[] = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      const question = await this.prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 1,
          order: i,
        },
      });
      questions.push(question);
    }

    return {
      message: `Generated quiz with ${questions.length} questions from note "${note.title}"`,
      quiz: this.formatQuiz(quiz),
      questions: questions.map(q => this.formatQuestion(q)),
    };
  }

  async generateFromText(userId: string, dto: GenerateQuizFromTextDto) {
    const generatedQuestions = await this.aiQuizService.generateQuizFromText(
      dto.text,
      dto.numberOfQuestions,
    );

    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        title: dto.title,
        description: dto.topic ? `Quiz on ${dto.topic}` : 'Generated from text',
        topic: dto.topic || dto.title,
        source: 'from-text',
        questionCount: generatedQuestions.length,
        tags: JSON.stringify(['generated', 'from-text']),
      },
    });

    const questions: any[] = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      const question = await this.prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 1,
          order: i,
        },
      });
      questions.push(question);
    }

    return {
      message: `Generated quiz with ${questions.length} questions from text`,
      quiz: this.formatQuiz(quiz),
      questions: questions.map(q => this.formatQuestion(q)),
    };
  }

  async addQuestion(userId: string, quizId: string, dto: AddQuestionDto) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or access denied');
    }

    const questionCount = await this.prisma.quizQuestion.count({
      where: { quizId },
    });

    const question = await this.prisma.quizQuestion.create({
      data: {
        quizId,
        question: dto.question,
        options: JSON.stringify(dto.options),
        correctAnswer: dto.correctAnswer,
        explanation: dto.explanation,
        points: dto.points || 1,
        order: questionCount,
      },
    });

    await this.prisma.quiz.update({
      where: { id: quizId },
      data: { questionCount: { increment: 1 } },
    });

    return this.formatQuestion(question);
  }

  async getQuizzes(userId: string, query: GetQuizzesQueryDto) {
    const { topic, includePublic = true, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { userId },
        ...(includePublic ? [{ isPublic: true }] : []),
      ],
    };

    if (topic) {
      where.topic = { contains: topic };
    }

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { questions: true, attempts: true },
          },
        },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      data: quizzes.map(q => ({
        ...this.formatQuiz(q),
        questionCount: q._count.questions,
        attemptCount: q._count.attempts,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuizById(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        attempts: {
          where: { userId },
          orderBy: { completedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const questionsForTaking = quiz.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
      points: q.points,
    }));

    return {
      ...this.formatQuiz(quiz),
      questions: questionsForTaking,
      totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      previousAttempts: quiz.attempts,
    };
  }

  async submitAttempt(userId: string, quizId: string, dto: SubmitQuizAttemptDto) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, OR: [{ userId }, { isPublic: true }] },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    let score = 0;
    let maxScore = 0;
    const answers: any[] = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const userAnswer = dto.answers[i];
      const isCorrect = userAnswer === question.correctAnswer;
      
      maxScore += question.points;
      if (isCorrect) {
        score += question.points;
      }

      answers.push({
        questionId: question.id,
        selectedAnswer: userAnswer || 0,
        isCorrect,
      });
    }

    const percentage = (score / maxScore) * 100;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        score,
        maxScore,
        percentage,
        timeTaken: dto.timeTaken,
        answers: {
          create: answers,
        },
      },
    });

    const xpEarned = this.calculateXpForQuiz(percentage);
    await this.awardXpForQuiz(userId, xpEarned, quiz.title, percentage);

    const results = answers.map((answer, idx) => ({
      questionId: quiz.questions[idx].id,
      question: quiz.questions[idx].question,
      correctAnswer: quiz.questions[idx].correctAnswer,
      explanation: quiz.questions[idx].explanation,
      selectedAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
    }));

    return {
      message: 'Quiz submitted successfully',
      attempt: {
        id: attempt.id,
        score,
        maxScore,
        percentage,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
      },
      xpEarned,
      results,
    };
  }

  async getAttempts(userId: string, quizId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { completedAt: 'desc' },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    return attempts;
  }

  async getQuizHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { userId },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              topic: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quizAttempt.count({ where: { userId } }),
    ]);

    return {
      data: attempts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuizAnalytics(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      select: {
        percentage: true,
        score: true,
        maxScore: true,
        completedAt: true,
      },
    });

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts 
      : 0;
    const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0;
    const perfectScores = attempts.filter(a => a.percentage === 100).length;

    const monthlyData: Record<string, { count: number; avgScore: number }> = {};
    for (const attempt of attempts) {
      const month = attempt.completedAt.toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, avgScore: 0 };
      }
      monthlyData[month].count++;
      monthlyData[month].avgScore += attempt.percentage;
    }
    
    for (const month in monthlyData) {
      monthlyData[month].avgScore = Math.round(monthlyData[month].avgScore / monthlyData[month].count);
    }

    return {
      totalAttempts,
      averageScore: Math.round(averageScore),
      bestScore: Math.round(bestScore),
      perfectScores,
      monthlyTrend: monthlyData,
    };
  }

  async getQuizStats(userId: string) {
    const stats = await this.prisma.quizAttempt.aggregate({
      where: { userId },
      _count: true,
      _avg: {
        percentage: true,
      },
      _max: {
        percentage: true,
      },
    });

    const totalQuizzes = await this.prisma.quiz.count({
      where: { userId },
    });

    return {
      totalAttempts: stats._count,
      averageScore: stats._avg.percentage || 0,
      highestScore: stats._max.percentage || 0,
      totalQuizzesCreated: totalQuizzes,
    };
  }

  async deleteQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.prisma.quiz.delete({
      where: { id: quizId },
    });

    return { message: 'Quiz deleted successfully' };
  }

  private formatQuiz(quiz: any): FormattedQuiz {
    return {
      ...quiz,
      tags: quiz.tags ? JSON.parse(quiz.tags) : [],
    };
  }

  private formatQuestion(question: any) {
    return {
      ...question,
      options: JSON.parse(question.options),
    };
  }

  private calculateXpForQuiz(percentage: number): number {
    if (percentage >= 90) return 50;
    if (percentage >= 70) return 30;
    if (percentage >= 50) return 20;
    return 10;
  }

  private async awardXpForQuiz(userId: string, xpEarned: number, quizTitle: string, percentage: number) {
    try {
      await this.prisma.xPLog.create({
        data: {
          userId,
          action: 'quiz-complete',
          xpEarned,
          metadata: JSON.stringify({ quizTitle, percentage }),
        },
      });
      
      await this.prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xpEarned } },
      });
    } catch (error) {
      this.logger.error(`Error awarding XP: ${error.message}`);
    }
  }
}