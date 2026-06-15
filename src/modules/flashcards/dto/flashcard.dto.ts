import { IsString, IsOptional, IsUUID, IsInt, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFlashcardDto {
  @IsString()
  front: string = '';

  @IsString()
  back: string = '';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;
}

export class GenerateFlashcardsFromNoteDto {
  @IsUUID()
  noteId: string = '';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfCards?: number = 5;
}

export class GenerateFlashcardsFromTextDto {
  @IsString()
  text: string = '';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfCards?: number = 5;
}

export class UpdateFlashcardDto {
  @IsOptional()
  @IsString()
  front?: string;

  @IsOptional()
  @IsString()
  back?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;
}

export class ReviewFlashcardDto {
  @IsInt()
  @Min(0)
  @Max(4)
  quality: number = 0;

  @IsOptional()
  @IsInt()
  responseTime?: number;
}

export class AnswerFlashcardDto {
  @IsInt()
  @Min(0)
  @Max(4)
  quality: number = 0;

  @IsOptional()
  @IsInt()
  responseTime?: number;
}

export class GetFlashcardsQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @Type(() => Boolean)
  dueOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class DueFlashcardsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}