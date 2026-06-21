import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SyncService } from './sync.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncRequestDto, SyncOperation, EntityType } from './dto/sync.dto';

@Controller('sync')
@UseGuards(AuthGuard('jwt'))
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async syncData(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncRequestDto,
  ) {
    return this.syncService.syncData(userId, dto);
  }

  @Post('notes')
  @HttpCode(HttpStatus.OK)
  async syncNotes(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncRequestDto,
  ) {
    dto.entityType = EntityType.NOTE;
    return this.syncService.syncData(userId, dto);
  }

  @Post('flashcards')
  @HttpCode(HttpStatus.OK)
  async syncFlashcards(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncRequestDto,
  ) {
    dto.entityType = EntityType.FLASHCARD;
    return this.syncService.syncData(userId, dto);
  }

  @Post('quiz-attempts')
  @HttpCode(HttpStatus.OK)
  async syncQuizAttempts(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncRequestDto,
  ) {
    dto.entityType = EntityType.QUIZ_ATTEMPT;
    return this.syncService.syncData(userId, dto);
  }

  @Get('status')
  async getSyncStatus(@CurrentUser('id') userId: string) {
    return this.syncService.getSyncStatus(userId);
  }

  @Post('resolve/:conflictId')
  @HttpCode(HttpStatus.OK)
  async resolveConflict(
    @CurrentUser('id') userId: string,
    @Param('conflictId') conflictId: string,
    @Body() body: { resolution: 'local' | 'server' },
  ) {
    return this.syncService.resolveConflict(userId, conflictId, body.resolution);
  }
}