import { IsString, IsOptional, IsInt, Min, Max, IsArray, IsBoolean, IsUUID, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string = '';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  timeLimit?: number;
}

export class GenerateQuizFromNoteDto {
  @IsUUID()
  noteId: string = '';

  @IsInt()
  @Min(1)
  @Max(20)
  numberOfQuestions: number = 5;
}

export class GenerateQuizFromTextDto {
  @IsString()
  text: string = '';

  @IsString()
  title: string = '';

  @IsOptional()
  @IsString()
  topic?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  numberOfQuestions: number = 5;
}

export class AddQuestionDto {
  @IsString()
  question: string = '';

  @IsArray()
  @IsString({ each: true })
  options: string[] = [];

  @IsInt()
  @Min(0)
  correctAnswer: number = 0;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number = 1;
}

export class SubmitQuizAttemptDto {
  @IsArray()
  answers: number[] = [];

  @IsOptional()
  @IsInt()
  timeTaken?: number;
}

export class GetQuizzesQueryDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includePublic?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class QuizAttemptQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}