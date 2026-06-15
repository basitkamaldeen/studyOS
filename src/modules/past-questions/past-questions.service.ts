import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SolveQuestionDto, UploadPastQuestionDto } from './dto/past-questions.dto';

interface PastQuestionEntry {
  id: string;
  userId: string;
  question: string;
  answer: string;
  explanation: string;
  examType: string;
  subject: string;
  year: number;
  createdAt: Date;
}

@Injectable()
export class PastQuestionsService {
  private readonly logger = new Logger(PastQuestionsService.name);

  constructor(private prisma: PrismaService) {}

  async solveQuestion(userId: string, dto: SolveQuestionDto) {
    // Mock AI solution generation
    const { question, examType, subject } = dto;
    
    const solution = this.generateMockSolution(question, examType, subject);
    
    const entry = await this.prisma.document.create({
      data: {
        userId,
        fileName: `past_question_${Date.now()}.json`,
        fileUrl: 'local',
        fileType: 'past-question',
        mimeType: 'application/json',
        fileSize: JSON.stringify(solution).length,
        extractedText: JSON.stringify({
          question,
          answer: solution.answer,
          explanation: solution.explanation,
          examType,
          subject,
          year: dto.year,
        }),
      },
    });

    return {
      message: 'Question solved successfully',
      id: entry.id,
      question,
      answer: solution.answer,
      explanation: solution.explanation,
      relatedConcepts: solution.relatedConcepts,
      examType,
      subject,
    };
  }

  async uploadPastQuestion(userId: string, dto: UploadPastQuestionDto) {
    const { text, examType, subject, year } = dto;
    
    const entry = await this.prisma.document.create({
      data: {
        userId,
        fileName: `${examType}_${subject}_${year}_${Date.now()}.txt`,
        fileUrl: 'local',
        fileType: 'past-question',
        mimeType: 'text/plain',
        fileSize: text.length,
        extractedText: text,
      },
    });

    return {
      message: 'Past question uploaded successfully',
      id: entry.id,
      examType,
      subject,
      year,
    };
  }

  async getHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.document.findMany({
        where: { userId, fileType: 'past-question' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where: { userId, fileType: 'past-question' } }),
    ]);

    const parsedEntries = entries.map(entry => {
      try {
        return {
          id: entry.id,
          ...JSON.parse(entry.extractedText || '{}'),
          createdAt: entry.createdAt,
        };
      } catch {
        return {
          id: entry.id,
          text: entry.extractedText,
          createdAt: entry.createdAt,
        };
      }
    });

    return {
      data: parsedEntries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEntryById(userId: string, id: string) {
    const entry = await this.prisma.document.findFirst({
      where: { id, userId, fileType: 'past-question' },
    });

    if (!entry) {
      throw new NotFoundException('Past question entry not found');
    }

    try {
      return {
        id: entry.id,
        ...JSON.parse(entry.extractedText || '{}'),
        createdAt: entry.createdAt,
      };
    } catch {
      return {
        id: entry.id,
        text: entry.extractedText,
        createdAt: entry.createdAt,
      };
    }
  }

  async getAnalytics(userId: string) {
    const entries = await this.prisma.document.findMany({
      where: { userId, fileType: 'past-question' },
    });

    const byExamType: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byYear: Record<string, number> = {};

    for (const entry of entries) {
      try {
        const data = JSON.parse(entry.extractedText || '{}');
        if (data.examType) byExamType[data.examType] = (byExamType[data.examType] || 0) + 1;
        if (data.subject) bySubject[data.subject] = (bySubject[data.subject] || 0) + 1;
        if (data.year) byYear[data.year] = (byYear[data.year] || 0) + 1;
      } catch {}
    }

    return {
      totalQuestions: entries.length,
      byExamType,
      bySubject,
      byYear,
      recentActivity: entries.slice(0, 10).map(e => e.createdAt),
    };
  }

  private generateMockSolution(question: string, examType: string, subject?: string) {
    const answers = [
      'The correct answer is based on fundamental principles. Let me break it down step by step.',
      'This question tests your understanding of key concepts. The answer is derived from first principles.',
      'After careful analysis, the solution involves applying the following formula and reasoning.',
    ];
    
    const explanations = [
      `This is a ${examType} ${subject || 'general'} question. The key insight is to recognize the pattern and apply the appropriate method.`,
      `Step 1: Understand what's being asked. Step 2: Recall relevant formulas. Step 3: Apply logical reasoning. Step 4: Verify your answer.`,
      `The solution requires connecting several concepts. First, identify the given information. Then, determine what's being asked. Finally, work through the problem systematically.`,
    ];
    
    const relatedConcepts = [
      ['Fundamental Principles', 'Problem Solving', 'Critical Thinking'],
      ['Key Formulas', 'Application Methods', 'Common Mistakes'],
      ['Theory Review', 'Practice Problems', 'Exam Strategies'],
    ];

    const randomIndex = Math.floor(Math.random() * answers.length);
    
    return {
      answer: answers[randomIndex],
      explanation: explanations[randomIndex],
      relatedConcepts: relatedConcepts[randomIndex],
    };
  }
}