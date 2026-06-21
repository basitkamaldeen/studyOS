import { IsString, IsOptional, IsArray, IsUUID, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum EntityType {
  NOTE = 'note',
  FLASHCARD = 'flashcard',
  QUIZ_ATTEMPT = 'quiz_attempt',
}

export class SyncItemDto {
  @IsUUID()
  id: string = '';

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  front?: string;

  @IsString()
  @IsOptional()
  back?: string;

  @IsArray()
  @IsOptional()
  answers?: number[];

  @IsNumber()
  @IsOptional()
  timeTaken?: number;

  @IsEnum(SyncOperation)
  operation: SyncOperation = SyncOperation.CREATE;

  @IsNumber()
  timestamp: number = Date.now();

  @IsOptional()
  metadata?: Record<string, any>;
}

export class SyncRequestDto {
  @IsEnum(EntityType)
  entityType: EntityType = EntityType.NOTE;

  @IsArray()
  items: SyncItemDto[] = [];

  @IsOptional()
  @IsNumber()
  lastSyncTimestamp?: number;
}

export class SyncResponseDto {
  success: boolean = true;
  synced: string[] = [];
  conflicts: ConflictDto[] = [];
  serverItems: ServerItemDto[] = [];
  timestamp: number = Date.now();
}

export class ConflictDto {
  localId: string = '';
  serverId: string = '';
  field: string = '';
  localValue: any;
  serverValue: any;
  resolution?: 'local' | 'server' | 'manual';
}

export class ServerItemDto {
  id: string = '';
  version: number = 0;
  updatedAt: string = '';
  data: Record<string, any> = {};
}

export class SyncStatusDto {
  userId: string = '';
  lastSync: number = 0;
  pendingChanges: number = 0;
  totalNotes: number = 0;
  totalFlashcards: number = 0;
  totalQuizAttempts: number = 0;
  online: boolean = true;
}