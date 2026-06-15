import { IsString, IsOptional, IsInt, Min, Max, IsUUID, IsIn } from 'class-validator';

export class SolveQuestionDto {
  @IsString()
  question: string = '';

  @IsOptional()
  @IsIn(['WAEC', 'JAMB', 'NECO', 'UNIVERSITY'])
  examType?: string = 'WAEC';

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsInt()
  year?: number;
}

export class UploadPastQuestionDto {
  @IsString()
  text: string = '';

  @IsString()
  @IsIn(['WAEC', 'JAMB', 'NECO', 'UNIVERSITY'])
  examType: string = 'WAEC';

  @IsString()
  subject: string = '';

  @IsInt()
  year: number = new Date().getFullYear();
}

export class GetHistoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}