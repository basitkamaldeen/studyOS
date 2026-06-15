import { IsString, IsOptional, IsBoolean, IsUUID, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string = '';

  @IsString()
  @IsOptional()
  content?: string = '';
}

export class UpdateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

export class NoteVersionDto {
  @IsUUID()
  noteId: string = '';

  @IsString()
  title: string = '';

  @IsString()
  content: string = '';
}

export class GetNotesQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

export class SearchNotesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}