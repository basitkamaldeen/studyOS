import { Injectable, Logger } from '@nestjs/common';
import { HfInference } from '@huggingface/inference';

interface FlashcardPair {
  front: string;
  back: string;
}

@Injectable()
export class AiFlashcardService {
  private readonly logger = new Logger(AiFlashcardService.name);
  private hf: HfInference;
  private useMockMode: boolean = false;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey || apiKey === 'your_hugging_face_api_key_here') {
      this.logger.warn('No Hugging Face API key found. Using mock mode for flashcard generation.');
      this.useMockMode = true;
    } else {
      this.hf = new HfInference(apiKey);
    }
  }

  async generateFlashcardsFromText(text: string, numberOfCards: number = 5): Promise<FlashcardPair[]> {
    if (this.useMockMode) {
      return this.getMockFlashcards(text, numberOfCards);
    }

    try {
      const prompt = `Based on the following text, generate ${numberOfCards} question and answer pairs that would help someone study and understand the material. Format each as "Q: [question] A: [answer]". Make questions test understanding, not just memorization.

Text:
${text.substring(0, 2000)}

Generate ${numberOfCards} Q&A pairs:`;

      const response = await this.hf.textGeneration({
        model: 'google/flan-t5-large',
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          do_sample: true,
        },
      });

      const flashcards = this.parseQaResponse(response.generated_text);
      
      if (flashcards.length === 0) {
        return this.getMockFlashcards(text, numberOfCards);
      }
      
      return flashcards.slice(0, numberOfCards);
    } catch (error) {
      this.logger.error(`Error generating flashcards: ${error.message}`);
      return this.getMockFlashcards(text, numberOfCards);
    }
  }

  async generateFlashcardsFromNote(noteTitle: string, noteContent: string, numberOfCards: number = 5): Promise<FlashcardPair[]> {
    const fullText = `Title: ${noteTitle}\n\nContent: ${noteContent}`;
    return this.generateFlashcardsFromText(fullText, numberOfCards);
  }

  private parseQaResponse(response: string): FlashcardPair[] {
    const flashcards: FlashcardPair[] = [];
    const lines = response.split('\n');
    let currentQuestion = '';
    
    for (const line of lines) {
      if (line.match(/^Q:/i) || line.match(/^Question:/i)) {
        currentQuestion = line.replace(/^Q:/i, '').replace(/^Question:/i, '').trim();
      } else if ((line.match(/^A:/i) || line.match(/^Answer:/i)) && currentQuestion) {
        const answer = line.replace(/^A:/i, '').replace(/^Answer:/i, '').trim();
        flashcards.push({ front: currentQuestion, back: answer });
        currentQuestion = '';
      }
    }
    
    return flashcards;
  }

  private getMockFlashcards(text: string, numberOfCards: number): FlashcardPair[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const flashcards: FlashcardPair[] = [];
    
    const mockCards: FlashcardPair[] = [
      { front: 'What is the main topic of this text?', back: `The main topic is ${sentences[0]?.substring(0, 100) || 'unknown'}.` },
      { front: 'What is a key point mentioned?', back: sentences[1]?.substring(0, 150) || 'Review the text for key points.' },
      { front: 'Can you summarize this in your own words?', back: 'Practice summarizing the main ideas from the text.' },
      { front: 'What questions do you have about this material?', back: 'Write down any questions that came to mind while reading.' },
      { front: 'How does this connect to what you already know?', back: 'Think about prior knowledge that relates to this topic.' },
    ];
    
    for (let i = 0; i < Math.min(numberOfCards, mockCards.length); i++) {
      flashcards.push(mockCards[i]);
    }
    
    while (flashcards.length < numberOfCards) {
      flashcards.push({
        front: `What is the significance of "${sentences[flashcards.length]?.substring(0, 50) || 'this concept'}"?`,
        back: 'Review the text to find the answer and write it in your own words.',
      });
    }
    
    return flashcards;
  }
}