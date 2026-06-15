import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiFlashcardService } from '../ai/ai-flashcard.service';
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

export interface FormattedFlashcard {
  id: string;
  userId: string;
  front: string;
  back: string;
  source: string | null;
  sourceId: string | null;
  tags: string[];
  difficulty: number | null;
  reviewCount: number;
  correctCount: number;
  easeFactor: number;
  interval: number;
  nextReview: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FlashcardsService {
  private readonly logger = new Logger(FlashcardsService.name);

  constructor(
    private prisma: PrismaService,
    private aiFlashcardService: AiFlashcardService,
  ) {}

  async createFlashcard(userId: string, dto: CreateFlashcardDto): Promise<FormattedFlashcard> {
    const flashcard = await this.prisma.flashcard.create({
      data: {
        userId,
        front: dto.front,
        back: dto.back,
        source: dto.source || 'manual',
        sourceId: dto.sourceId,
        tags: dto.tags ? JSON.stringify(dto.tags) : '[]',
        nextReview: new Date(),
      },
    });

    return this.formatFlashcard(flashcard);
  }

  async generateFromNote(userId: string, dto: GenerateFlashcardsFromNoteDto): Promise<{ message: string; flashcards: FormattedFlashcard[] }> {
    const note = await this.prisma.note.findFirst({
      where: { id: dto.noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const generatedCards = await this.aiFlashcardService.generateFlashcardsFromNote(
      note.title,
      note.content,
      dto.numberOfCards,
    );

    const flashcards: FormattedFlashcard[] = [];
    for (const card of generatedCards) {
      const flashcard = await this.prisma.flashcard.create({
        data: {
          userId,
          front: card.front,
          back: card.back,
          source: 'ai-generated',
          sourceId: note.id,
          tags: JSON.stringify(['from-note', 'ai-generated']),
          nextReview: new Date(),
        },
      });
      flashcards.push(this.formatFlashcard(flashcard));
    }

    return {
      message: `Generated ${flashcards.length} flashcards from note "${note.title}"`,
      flashcards,
    };
  }

  async generateFromText(userId: string, dto: GenerateFlashcardsFromTextDto): Promise<{ message: string; flashcards: FormattedFlashcard[] }> {
    const generatedCards = await this.aiFlashcardService.generateFlashcardsFromText(
      dto.text,
      dto.numberOfCards,
    );

    const flashcards: FormattedFlashcard[] = [];
    for (const card of generatedCards) {
      const tags = ['ai-generated', 'from-text'];
      if (dto.title) tags.push(dto.title);
      
      const flashcard = await this.prisma.flashcard.create({
        data: {
          userId,
          front: card.front,
          back: card.back,
          source: 'ai-generated',
          tags: JSON.stringify(tags),
          nextReview: new Date(),
        },
      });
      flashcards.push(this.formatFlashcard(flashcard));
    }

    return {
      message: `Generated ${flashcards.length} flashcards from text`,
      flashcards,
    };
  }

  async getFlashcards(userId: string, query: GetFlashcardsQueryDto): Promise<{ data: FormattedFlashcard[]; meta: any }> {
    const { tags, source, dueOnly = false, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    
    if (source) {
      where.source = source;
    }
    
    if (dueOnly) {
      where.nextReview = { lte: new Date() };
    }
    
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        where.tags = { contains: tag };
      }
    }

    const [flashcards, total] = await Promise.all([
      this.prisma.flashcard.findMany({
        where,
        orderBy: { nextReview: 'asc' },
        skip,
        take: limit,
        include: {
          reviews: {
            orderBy: { reviewedAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.flashcard.count({ where }),
    ]);

    const dueCount = await this.prisma.flashcard.count({
      where: { userId, nextReview: { lte: new Date() } },
    });

    return {
      data: flashcards.map(f => this.formatFlashcard(f)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dueCount,
      },
    };
  }

  async getDueFlashcards(userId: string, limit: number = 20): Promise<FormattedFlashcard[]> {
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        userId,
        nextReview: { lte: new Date() },
      },
      orderBy: { nextReview: 'asc' },
      take: limit,
    });

    return flashcards.map(f => this.formatFlashcard(f));
  }

  async getFlashcardById(userId: string, flashcardId: string): Promise<FormattedFlashcard> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, userId },
      include: {
        reviews: {
          orderBy: { reviewedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    return this.formatFlashcard(flashcard);
  }

  async updateFlashcard(userId: string, flashcardId: string, dto: UpdateFlashcardDto): Promise<FormattedFlashcard> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    const updated = await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: {
        ...(dto.front !== undefined && { front: dto.front }),
        ...(dto.back !== undefined && { back: dto.back }),
        ...(dto.tags !== undefined && { tags: JSON.stringify(dto.tags) }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
      },
    });

    return this.formatFlashcard(updated);
  }

  async reviewFlashcard(userId: string, flashcardId: string, dto: ReviewFlashcardDto) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    const { quality } = dto;
    let { easeFactor, interval, reviewCount, correctCount } = flashcard;
    
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    if (quality >= 3) {
      if (reviewCount === 0) {
        interval = 1;
      } else if (reviewCount === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      reviewCount++;
      correctCount++;
    } else {
      interval = 0;
      reviewCount++;
    }
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    await this.prisma.flashcardReview.create({
      data: {
        flashcardId,
        userId,
        quality,
        responseTime: dto.responseTime || 0,
      },
    });
    
    const updated = await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: {
        easeFactor,
        interval,
        reviewCount,
        correctCount,
        nextReview,
        updatedAt: new Date(),
      },
    });
    
    await this.awardXpForReview(userId, quality);
    
    return {
      message: 'Flashcard reviewed successfully',
      nextReview: updated.nextReview,
      interval: updated.interval,
      easeFactor: updated.easeFactor,
      review: {
        quality,
        responseTime: dto.responseTime,
      },
    };
  }

  async answerFlashcard(userId: string, flashcardId: string, dto: AnswerFlashcardDto) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    const { quality } = dto;
    let { easeFactor, interval, reviewCount, correctCount } = flashcard;
    
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    if (quality >= 3) {
      if (reviewCount === 0) {
        interval = 1;
      } else if (reviewCount === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      reviewCount++;
      correctCount++;
    } else {
      interval = 0;
      reviewCount++;
    }
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    await this.prisma.flashcardReview.create({
      data: {
        flashcardId,
        userId,
        quality,
        responseTime: dto.responseTime || 0,
      },
    });
    
    const updated = await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: {
        easeFactor,
        interval,
        reviewCount,
        correctCount,
        nextReview,
        updatedAt: new Date(),
      },
    });
    
    await this.awardXpForReview(userId, quality);
    
    return {
      message: 'Flashcard answered successfully',
      nextReview: updated.nextReview,
      interval: updated.interval,
      easeFactor: updated.easeFactor,
    };
  }

  async getMasteryStats(userId: string) {
    const flashcards = await this.prisma.flashcard.findMany({
      where: { userId },
      select: {
        reviewCount: true,
        correctCount: true,
        interval: true,
      },
    });

    const totalCards = flashcards.length;
    const mastered = flashcards.filter(f => f.interval >= 21).length;
    const learning = flashcards.filter(f => f.interval > 0 && f.interval < 21).length;
    const newCards = flashcards.filter(f => f.reviewCount === 0).length;
    
    let totalAccuracy = 0;
    for (const f of flashcards) {
      if (f.reviewCount > 0) {
        totalAccuracy += (f.correctCount / f.reviewCount) * 100;
      }
    }
    const averageAccuracy = totalCards > 0 ? Math.round(totalAccuracy / totalCards) : 0;

    return {
      totalCards,
      mastered,
      learning,
      new: newCards,
      averageAccuracy,
    };
  }

  async deleteFlashcard(userId: string, flashcardId: string): Promise<{ message: string }> {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, userId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    await this.prisma.flashcard.delete({
      where: { id: flashcardId },
    });

    return { message: 'Flashcard deleted successfully' };
  }

  async getReviewStats(userId: string) {
    const stats = await this.prisma.flashcard.aggregate({
      where: { userId },
      _sum: {
        reviewCount: true,
        correctCount: true,
      },
      _count: true,
    });

    const dueCount = await this.prisma.flashcard.count({
      where: {
        userId,
        nextReview: { lte: new Date() },
      },
    });

    const totalReviews = stats._sum.reviewCount || 0;
    const totalCorrect = stats._sum.correctCount || 0;

    return {
      totalCards: stats._count,
      totalReviews,
      totalCorrect,
      accuracy: totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0,
      dueForReview: dueCount,
    };
  }

  private formatFlashcard(flashcard: any): FormattedFlashcard {
    return {
      ...flashcard,
      tags: flashcard.tags ? JSON.parse(flashcard.tags) : [],
    };
  }

  private async awardXpForReview(userId: string, quality: number) {
    let xpEarned = 5;
    
    if (quality >= 3) {
      xpEarned += 5;
    }
    if (quality >= 4) {
      xpEarned += 5;
    }
    
    try {
      await this.prisma.xPLog.create({
        data: {
          userId,
          action: 'flashcard-review',
          xpEarned,
          metadata: JSON.stringify({ quality }),
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