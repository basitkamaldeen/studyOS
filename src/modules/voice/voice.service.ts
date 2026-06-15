import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiFlashcardService } from '../ai/ai-flashcard.service';
import { AiQuizService } from '../ai/ai-quiz.service';
import { TranscribeAudioDto, GenerateFromTranscriptDto, VoiceToStudyDto } from './dto/voice.dto';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private prisma: PrismaService,
    private aiFlashcardService: AiFlashcardService,
    private aiQuizService: AiQuizService,
  ) {}

  async transcribeAudio(userId: string, dto: TranscribeAudioDto) {
    // Mock transcription - in production, use OpenAI Whisper or Hugging Face
    const mockTranscript = `This is a simulated transcript of the audio lecture. The speaker discussed important concepts about ${dto.audioUrl}. Key points include understanding the fundamentals and applying them in practice.`;
    
    // Save transcript as a document
    const document = await this.prisma.document.create({
      data: {
        userId,
        fileName: `voice_${Date.now()}.txt`,
        fileUrl: dto.audioUrl,
        fileType: 'audio',
        mimeType: 'audio/mpeg',
        fileSize: 0,
        extractedText: mockTranscript,
      },
    });

    return {
      message: 'Audio transcribed successfully',
      documentId: document.id,
      transcript: mockTranscript,
      wordCount: mockTranscript.split(' ').length,
    };
  }

  async generateSummary(userId: string, dto: VoiceToStudyDto) {
    const { transcript, title } = dto;
    
    // Mock summary generation
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = `Summary of "${title || 'Voice Recording'}":\n\n` +
      `Main Topic: ${sentences[0]?.substring(0, 100) || 'Unknown'}\n\n` +
      `Key Points:\n${sentences.slice(1, 4).map((s, i) => `${i + 1}. ${s.trim().substring(0, 80)}...`).join('\n')}\n\n` +
      `Conclusion: ${sentences[sentences.length - 1]?.substring(0, 100) || 'Review the full transcript for details.'}`;

    // Save as a note
    const note = await this.prisma.note.create({
      data: {
        userId,
        title: title ? `Summary: ${title}` : `Voice Summary ${new Date().toLocaleDateString()}`,
        content: summary,
      },
    });

    return {
      message: 'Summary generated successfully',
      noteId: note.id,
      summary,
    };
  }

  async generateFlashcardsFromVoice(userId: string, dto: GenerateFromTranscriptDto) {
    const { transcript, title, numberOfCards = 5 } = dto;
    
    const generatedCards = await this.aiFlashcardService.generateFlashcardsFromText(
      transcript,
      numberOfCards,
    );

    const flashcards = [];
    for (const card of generatedCards) {
      const flashcard = await this.prisma.flashcard.create({
        data: {
          userId,
          front: card.front,
          back: card.back,
          source: 'voice-generated',
          tags: JSON.stringify(['voice', 'ai-generated', title || '']),
          nextReview: new Date(),
        },
      });
      flashcards.push({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
      });
    }

    return {
      message: `Generated ${flashcards.length} flashcards from voice transcript`,
      flashcards,
    };
  }

  async generateQuizFromVoice(userId: string, dto: GenerateFromTranscriptDto) {
    const { transcript, title, numberOfQuestions = 5 } = dto;
    
    const generatedQuestions = await this.aiQuizService.generateQuizFromText(
      transcript,
      numberOfQuestions,
    );

    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        title: title ? `Quiz: ${title}` : `Voice Quiz ${new Date().toLocaleDateString()}`,
        description: 'Generated from voice recording',
        source: 'voice-generated',
        questionCount: generatedQuestions.length,
        tags: JSON.stringify(['voice', 'generated']),
      },
    });

    const questions = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      const question = await this.prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 1,
          order: i,
        },
      });
      questions.push({
        id: question.id,
        question: question.question,
        options: JSON.parse(question.options),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });
    }

    return {
      message: `Generated quiz with ${questions.length} questions from voice transcript`,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questionCount: quiz.questionCount,
      },
      questions,
    };
  }

  async extractKeyConcepts(userId: string, dto: VoiceToStudyDto) {
    const { transcript, title } = dto;
    
    // Extract key concepts using NLP simulation
    const words = transcript.toLowerCase().split(/\s+/);
    const wordFrequency: Record<string, number> = {};
    
    for (const word of words) {
      if (word.length > 5 && !['the', 'and', 'this', 'that', 'with', 'from'].includes(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    }
    
    const keyConcepts = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return {
      message: 'Key concepts extracted successfully',
      title: title || 'Voice Recording',
      keyConcepts,
      totalConcepts: keyConcepts.length,
    };
  }
}