import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeaknessMapService {
  constructor(private prisma: PrismaService) {}

  async getWeaknessMap(userId: string) {
    // Analyze quiz performance
    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: true,
        answers: {
          include: { question: true },
        },
      },
    });

    // Analyze flashcard performance
    const flashcardReviews = await this.prisma.flashcardReview.findMany({
      where: { userId },
      include: { flashcard: true },
    });

    // Calculate topic performance
    const topicPerformance: Record<string, { correct: number; total: number; percentage: number }> = {};

    for (const attempt of quizAttempts) {
      const topic = attempt.quiz.topic || 'General';
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0, percentage: 0 };
      }
      topicPerformance[topic].total += attempt.answers.length;
      topicPerformance[topic].correct += attempt.answers.filter(a => a.isCorrect).length;
    }

    for (const topic in topicPerformance) {
      topicPerformance[topic].percentage = (topicPerformance[topic].correct / topicPerformance[topic].total) * 100;
    }

    // Identify weak and strong topics
    const weakTopics = Object.entries(topicPerformance)
      .filter(([_, data]) => data.percentage < 60)
      .map(([topic, data]) => ({ topic, ...data }));

    const strongTopics = Object.entries(topicPerformance)
      .filter(([_, data]) => data.percentage >= 80)
      .map(([topic, data]) => ({ topic, ...data }));

    // Calculate overall performance
    const totalCorrect = quizAttempts.reduce((sum, a) => sum + a.answers.filter(ans => ans.isCorrect).length, 0);
    const totalQuestions = quizAttempts.reduce((sum, a) => sum + a.answers.length, 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Flashcard mastery
    const totalFlashcards = flashcardReviews.length;
    const masteredFlashcards = flashcardReviews.filter(r => r.quality >= 3).length;
    const flashcardMastery = totalFlashcards > 0 ? (masteredFlashcards / totalFlashcards) * 100 : 0;

    return {
      overall: {
        accuracy: Math.round(overallAccuracy),
        quizAttempts: quizAttempts.length,
        totalQuestions,
        totalCorrect,
        flashcardMastery: Math.round(flashcardMastery),
        totalFlashcards,
      },
      weakTopics,
      strongTopics,
      recommendations: this.generateRecommendations(weakTopics, overallAccuracy, flashcardMastery),
    };
  }

  async getTopics(userId: string) {
    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      include: { quiz: true },
    });

    const topics = new Set<string>();
    for (const attempt of quizAttempts) {
      if (attempt.quiz.topic) {
        topics.add(attempt.quiz.topic);
      }
    }

    return Array.from(topics).map(topic => ({ name: topic }));
  }

  async getRecommendations(userId: string) {
    const weaknessMap = await this.getWeaknessMap(userId);
    return weaknessMap.recommendations;
  }

  private generateRecommendations(weakTopics: any[], overallAccuracy: number, flashcardMastery: number): string[] {
    const recommendations: string[] = [];

    if (weakTopics.length > 0) {
      recommendations.push(`Focus on improving these topics: ${weakTopics.map(t => t.topic).join(', ')}`);
      recommendations.push(`Create more flashcards for ${weakTopics[0]?.topic || 'weak topics'} to reinforce learning`);
    }

    if (overallAccuracy < 60) {
      recommendations.push('Review fundamental concepts before attempting advanced questions');
      recommendations.push('Use the AI Tutor to explain difficult concepts');
    }

    if (flashcardMastery < 50) {
      recommendations.push('Increase flashcard review frequency using spaced repetition');
    }

    if (weakTopics.length === 0 && overallAccuracy >= 80) {
      recommendations.push('Great job! Challenge yourself with advanced quizzes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the good work! Consistent practice will maintain your skills');
    }

    return recommendations;
  }
}