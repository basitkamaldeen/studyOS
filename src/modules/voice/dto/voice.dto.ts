import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class TranscribeAudioDto {
  @IsString()
  audioUrl: string = '';

  @IsOptional()
  @IsString()
  language?: string = 'en';
}

export class GenerateFromTranscriptDto {
  @IsString()
  transcript: string = '';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfCards?: number = 5;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfQuestions?: number = 5;
}

export class VoiceToStudyDto {
  @IsString()
  transcript: string = '';

  @IsOptional()
  @IsString()
  title?: string;
}