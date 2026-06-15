import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string = '';

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class CreateConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;
}