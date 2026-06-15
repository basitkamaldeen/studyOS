import { Injectable, Logger } from '@nestjs/common';
import { HfInference } from '@huggingface/inference';

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

@Injectable()
export class AiQuizService {
  private readonly logger = new Logger(AiQuizService.name);
  private hf: HfInference;
  private useMockMode: boolean = false;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey || apiKey === 'your_hugging_face_api_key_here') {
      this.logger.warn('No Hugging Face API key found. Using mock mode for quiz generation.');
      this.useMockMode = true;
    } else {
      this.hf = new HfInference(apiKey);
    }
  }

  async generateQuizFromText(text: string, numberOfQuestions: number = 5): Promise<GeneratedQuestion[]> {
    if (this.useMockMode) {
      return this.getMockQuizQuestions(text, numberOfQuestions);
    }

    try {
      const prompt = `Based on the following text, generate ${numberOfQuestions} multiple-choice questions. For each question, provide 4 options (A, B, C, D) and indicate the correct answer. Format each as:
Q: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Correct: [A/B/C/D]
Explanation: [explanation]

Text:
${text.substring(0, 2000)}

Generate ${numberOfQuestions} questions:`;

      const response = await this.hf.textGeneration({
        model: 'google/flan-t5-large',
        inputs: prompt,
        parameters: {
          max_new_tokens: 1500,
          temperature: 0.7,
          do_sample: true,
        },
      });

      const questions = this.parseQuizResponse(response.generated_text);
      
      if (questions.length === 0) {
        return this.getMockQuizQuestions(text, numberOfQuestions);
      }
      
      return questions.slice(0, numberOfQuestions);
    } catch (error) {
      this.logger.error(`Error generating quiz: ${error.message}`);
      return this.getMockQuizQuestions(text, numberOfQuestions);
    }
  }

  async generateQuizFromNote(noteTitle: string, noteContent: string, numberOfQuestions: number = 5): Promise<GeneratedQuestion[]> {
    const fullText = `Title: ${noteTitle}\n\nContent: ${noteContent}`;
    return this.generateQuizFromText(fullText, numberOfQuestions);
  }

  private parseQuizResponse(response: string): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const sections = response.split(/Q:/i).slice(1);
    
    for (const section of sections) {
      const lines = section.trim().split('\n');
      const question = lines[0].trim();
      
      const options: string[] = [];
      let correctAnswer = 0;
      let explanation = '';
      
      for (const line of lines) {
        if (line.match(/^[A-D]\)/i)) {
          options.push(line.substring(2).trim());
        } else if (line.match(/Correct:/i)) {
          const correctLetter = line.match(/[A-D]/i)?.[0]?.toUpperCase();
          if (correctLetter) {
            correctAnswer = correctLetter.charCodeAt(0) - 65;
          }
        } else if (line.match(/Explanation:/i)) {
          explanation = line.replace(/Explanation:/i, '').trim();
        }
      }
      
      if (question && options.length === 4) {
        questions.push({ question, options, correctAnswer, explanation });
      }
    }
    
    return questions;
  }

  private getMockQuizQuestions(text: string, numberOfQuestions: number): GeneratedQuestion[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const questions: GeneratedQuestion[] = [];
    
    const mockQuestions = [
      {
        question: 'What is the main topic of this text?',
        options: [
          sentences[0]?.substring(0, 50) || 'Option A',
          sentences[1]?.substring(0, 50) || 'Option B',
          sentences[2]?.substring(0, 50) || 'Option C',
          'None of the above',
        ],
        correctAnswer: 0,
        explanation: 'The main topic is introduced in the first sentence.',
      },
      {
        question: 'Based on the text, which statement is true?',
        options: [
          'Statement A from the text',
          'Statement B from the text',
          'Statement C from the text',
          'All of the above',
        ],
        correctAnswer: 0,
        explanation: 'Review the key points mentioned in the text.',
      },
      {
        question: 'What can be inferred from the content?',
        options: [
          'Inference 1',
          'Inference 2',
          'Inference 3',
          'Cannot be determined',
        ],
        correctAnswer: 3,
        explanation: 'Make sure to base inferences on evidence from the text.',
      },
    ];
    
    for (let i = 0; i < Math.min(numberOfQuestions, mockQuestions.length); i++) {
      questions.push(mockQuestions[i]);
    }
    
    while (questions.length < numberOfQuestions) {
      questions.push({
        question: `What is the significance of "${sentences[questions.length]?.substring(0, 50) || 'this concept'}"?`,
        options: [
          'Significance 1',
          'Significance 2',
          'Significance 3',
          'Significance 4',
        ],
        correctAnswer: 0,
        explanation: 'Review the text to understand the significance.',
      });
    }
    
    return questions;
  }
}