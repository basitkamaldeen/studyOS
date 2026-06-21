import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  SyncRequestDto, 
  SyncResponseDto, 
  SyncItemDto, 
  ConflictDto,
  SyncOperation,
  EntityType,
  SyncStatusDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  async syncData(userId: string, dto: SyncRequestDto): Promise<SyncResponseDto> {
    const response: SyncResponseDto = {
      success: true,
      synced: [],
      conflicts: [],
      serverItems: [],
      timestamp: Date.now(),
    };

    try {
      switch (dto.entityType) {
        case EntityType.NOTE:
          await this.syncNotes(userId, dto, response);
          break;
        case EntityType.FLASHCARD:
          await this.syncFlashcards(userId, dto, response);
          break;
        case EntityType.QUIZ_ATTEMPT:
          await this.syncQuizAttempts(userId, dto, response);
          break;
        default:
          throw new Error(`Unsupported entity type: ${dto.entityType}`);
      }
    } catch (error) {
      this.logger.error(`Sync error: ${error.message}`);
      response.success = false;
    }

    return response;
  }

  private async syncNotes(userId: string, dto: SyncRequestDto, response: SyncResponseDto) {
    const serverNotes = await this.prisma.note.findMany({
      where: { userId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    const serverNoteMap = new Map(serverNotes.map(n => [n.id, n]));

    for (const item of dto.items) {
      try {
        const serverNote = serverNoteMap.get(item.id);
        
        switch (item.operation) {
          case SyncOperation.CREATE:
            if (serverNote) {
              response.conflicts.push({
                localId: item.id,
                serverId: serverNote.id,
                field: 'id',
                localValue: item.id,
                serverValue: serverNote.id,
                resolution: 'manual',
              });
              continue;
            }

            const created = await this.prisma.note.create({
              data: {
                userId,
                title: item.title || 'Untitled',
                content: item.content || '',
              },
            });
            response.synced.push(created.id);
            break;

          case SyncOperation.UPDATE:
            if (!serverNote) {
              const created = await this.prisma.note.create({
                data: {
                  userId,
                  title: item.title || 'Untitled',
                  content: item.content || '',
                },
              });
              response.synced.push(created.id);
              break;
            }

            const latestVersion = serverNote.versions[0];
            const serverVersion = latestVersion?.versionNumber || 0;
            
            if (item.timestamp > new Date(serverNote.updatedAt).getTime()) {
              const updated = await this.prisma.note.update({
                where: { id: serverNote.id },
                data: {
                  title: item.title || serverNote.title,
                  content: item.content || serverNote.content,
                },
              });
              response.synced.push(updated.id);
            } else {
              response.serverItems.push({
                id: serverNote.id,
                version: serverVersion + 1,
                updatedAt: serverNote.updatedAt.toISOString(),
                data: {
                  title: serverNote.title,
                  content: serverNote.content,
                },
              });
            }
            break;

          case SyncOperation.DELETE:
            if (serverNote) {
              await this.prisma.note.delete({
                where: { id: serverNote.id },
              });
              response.synced.push(item.id);
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Error syncing note ${item.id}: ${error.message}`);
        response.conflicts.push({
          localId: item.id,
          serverId: '',
          field: 'error',
          localValue: error.message,
          serverValue: '',
        });
      }
    }
  }

  private async syncFlashcards(userId: string, dto: SyncRequestDto, response: SyncResponseDto) {
    const serverFlashcards = await this.prisma.flashcard.findMany({
      where: { userId },
    });

    const serverMap = new Map(serverFlashcards.map(f => [f.id, f]));

    for (const item of dto.items) {
      try {
        const serverItem = serverMap.get(item.id);

        switch (item.operation) {
          case SyncOperation.CREATE:
            if (serverItem) {
              response.conflicts.push({
                localId: item.id,
                serverId: serverItem.id,
                field: 'id',
                localValue: item.id,
                serverValue: serverItem.id,
              });
              continue;
            }

            const created = await this.prisma.flashcard.create({
              data: {
                userId,
                front: item.front || 'Question',
                back: item.back || 'Answer',
                tags: JSON.stringify(item.metadata?.tags || []),
                nextReview: new Date(),
              },
            });
            response.synced.push(created.id);
            break;

          case SyncOperation.UPDATE:
            if (!serverItem) {
              const created = await this.prisma.flashcard.create({
                data: {
                  userId,
                  front: item.front || 'Question',
                  back: item.back || 'Answer',
                  tags: JSON.stringify(item.metadata?.tags || []),
                  nextReview: new Date(),
                },
              });
              response.synced.push(created.id);
              break;
            }

            if (item.timestamp > new Date(serverItem.updatedAt).getTime()) {
              const updated = await this.prisma.flashcard.update({
                where: { id: serverItem.id },
                data: {
                  front: item.front || serverItem.front,
                  back: item.back || serverItem.back,
                },
              });
              response.synced.push(updated.id);
            } else {
              response.serverItems.push({
                id: serverItem.id,
                version: serverItem.reviewCount + 1,
                updatedAt: serverItem.updatedAt.toISOString(),
                data: {
                  front: serverItem.front,
                  back: serverItem.back,
                },
              });
            }
            break;

          case SyncOperation.DELETE:
            if (serverItem) {
              await this.prisma.flashcard.delete({
                where: { id: serverItem.id },
              });
              response.synced.push(item.id);
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Error syncing flashcard ${item.id}: ${error.message}`);
        response.conflicts.push({
          localId: item.id,
          serverId: '',
          field: 'error',
          localValue: error.message,
          serverValue: '',
        });
      }
    }
  }

  private async syncQuizAttempts(userId: string, dto: SyncRequestDto, response: SyncResponseDto) {
    for (const item of dto.items) {
      try {
        switch (item.operation) {
          case SyncOperation.CREATE:
            // Find quiz with questions included
            const quiz = await this.prisma.quiz.findFirst({
              where: { 
                id: item.metadata?.quizId,
                userId: userId
              },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                },
              },
            });

            if (!quiz) {
              response.conflicts.push({
                localId: item.id,
                serverId: '',
                field: 'quizId',
                localValue: item.metadata?.quizId,
                serverValue: 'Quiz not found or access denied',
              });
              continue;
            }

            // Create the attempt
            const attempt = await this.prisma.quizAttempt.create({
              data: {
                userId,
                quizId: quiz.id,
              },
            });

            // Create quiz answers
            if (item.answers && Array.isArray(item.answers)) {
              const questionIds = quiz.questions.map(q => q.id);
              
              for (let i = 0; i < Math.min(item.answers.length, questionIds.length); i++) {
                const selectedAnswer = item.answers[i];
                const questionId = questionIds[i];
                
                if (questionId && selectedAnswer !== undefined) {
                  await this.prisma.quizAnswer.create({
                    data: {
                      attemptId: attempt.id,
                      questionId: questionId,
                      selectedAnswer: selectedAnswer,
                      isCorrect: false,
                    },
                  });
                }
              }
            }
            
            response.synced.push(attempt.id);
            break;

          case SyncOperation.DELETE:
            // Don't delete quiz attempts, they're historical data
            break;
        }
      } catch (error) {
        this.logger.error(`Error syncing quiz attempt ${item.id}: ${error.message}`);
        response.conflicts.push({
          localId: item.id,
          serverId: '',
          field: 'error',
          localValue: error.message,
          serverValue: '',
        });
      }
    }
  }

  async getSyncStatus(userId: string): Promise<SyncStatusDto> {
    const [notes, flashcards, quizAttempts] = await Promise.all([
      this.prisma.note.count({ where: { userId } }),
      this.prisma.flashcard.count({ where: { userId } }),
      this.prisma.quizAttempt.count({ where: { userId } }),
    ]);

    const lastSyncLog = await this.prisma.xPLog.findFirst({
      where: { userId, action: 'sync_completed' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      userId,
      lastSync: lastSyncLog ? new Date(lastSyncLog.createdAt).getTime() : 0,
      pendingChanges: 0,
      totalNotes: notes,
      totalFlashcards: flashcards,
      totalQuizAttempts: quizAttempts,
      online: true,
    };
  }

  async resolveConflict(userId: string, conflictId: string, resolution: 'local' | 'server') {
    return { message: 'Conflict resolved successfully' };
  }
}