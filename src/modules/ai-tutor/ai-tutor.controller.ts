import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiTutorService } from './ai-tutor.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto, CreateConversationDto } from './dto/chat.dto';

@Controller('ai-tutor')
@UseGuards(AuthGuard('jwt'))
export class AiTutorController {
  constructor(private readonly aiTutorService: AiTutorService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.aiTutorService.createConversation(userId, dto.title, dto.topic);
  }

  @Get('conversations')
  async getUserConversations(@CurrentUser('id') userId: string) {
    return this.aiTutorService.getUserConversations(userId);
  }

  @Get('conversations/:id')
  async getConversationById(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.aiTutorService.getConversationById(userId, conversationId);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.aiTutorService.sendMessage(userId, dto.conversationId || null, dto.message);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.aiTutorService.deleteConversation(userId, conversationId);
  }
}