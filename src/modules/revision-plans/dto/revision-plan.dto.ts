import { IsString, IsOptional, IsDate, IsBoolean, IsUUID, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRevisionPlanDto {
  @IsString()
  title: string = '';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  targetExam?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  examDate?: Date;
}

export class GeneratePlanDto {
  @Type(() => Date)
  @IsDate()
  examDate: Date = new Date();

  @IsArray()
  @IsString({ each: true })
  subjects: string[] = [];
}

export class UpdateRevisionPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  targetExam?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  examDate?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddTaskDto {
  @IsString()
  topic: string = '';

  @Type(() => Date)
  @IsDate()
  dueDate: Date = new Date();
}

export class GetPlansQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class StudyReportQueryDto {
  @IsOptional()
  @Type(() => String)
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  week?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2030)
  year?: number;
}