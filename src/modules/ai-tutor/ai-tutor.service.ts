import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HfInference } from '@huggingface/inference';

@Injectable()
export class AiTutorService {
  private readonly logger = new Logger(AiTutorService.name);
  private hf: HfInference;
  private useMockMode: boolean = true;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (apiKey && apiKey !== 'your_hugging_face_api_key_here') {
      this.hf = new HfInference(apiKey);
      this.useMockMode = false;
      this.logger.log('AI Tutor using real Hugging Face API');
    } else {
      this.logger.warn('No Hugging Face API key found. Using mock mode for AI Tutor.');
    }
  }

  async createConversation(userId: string, title: string, topic?: string) {
    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        title,
        topic,
      },
    });
    return conversation;
  }

  async getUserConversations(userId: string) {
    const conversations = await this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });
    return conversations;
  }

  async getConversationById(userId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async sendMessage(userId: string, conversationId: string | null, message: string) {
    let conversation = null as any;
    
    if (conversationId) {
      conversation = await this.prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
      });
      
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      conversation = await this.prisma.aIConversation.create({
        data: {
          userId,
          title,
        },
      });
    }

    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    const aiResponse = await this.generateAIResponse(message, conversation.topic || undefined);
    
    const assistantMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    await this.prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
    };
  }

  private async generateAIResponse(message: string, topic?: string): Promise<string> {
    if (this.useMockMode) {
      return this.getMockResponse(message, topic);
    }

    try {
      const prompt = `You are a helpful AI tutor for students. Answer the following question in a clear, educational manner. ${topic ? `Topic: ${topic}` : ''}

Student question: ${message}

Provide a helpful, accurate, and encouraging response:`;

      const response = await this.hf.textGeneration({
        model: 'google/flan-t5-large',
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          do_sample: true,
        },
      });

      return response.generated_text || this.getMockResponse(message, topic);
    } catch (error) {
      this.logger.error(`AI generation error: ${error.message}`);
      return this.getMockResponse(message, topic);
    }
  }

  private getMockResponse(message: string, topic?: string): string {
    const responses = [
      `That's a great question about "${message.substring(0, 50)}..."! Let me explain this concept in simple terms. The key principles to understand are the fundamentals, which apply to many real-world situations. Would you like me to provide some examples to help clarify?`,

      `I understand you're asking about this topic. Here's a helpful way to think about it: break down the problem into smaller parts, understand each component, and then see how they fit together. This approach works well for ${topic || 'most subjects'}!`,

      `Excellent question! The answer involves understanding three main concepts: first, the basic definition; second, how it applies in practice; and third, common examples you might encounter. Shall we go through each of these step by step?`,

      `This is an important concept in ${topic || 'your studies'}. Think of it as building blocks - once you understand the foundation, more complex ideas become easier. What specific aspect would you like me to explain in more detail?`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.aIConversation.delete({
      where: { id: conversationId },
    });

    return { message: 'Conversation deleted successfully' };
  }
}