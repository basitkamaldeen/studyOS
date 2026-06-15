export class LeaderboardQueryDto {
  period?: 'all' | 'weekly' | 'monthly' = 'all';
  limit?: number = 50;
  page?: number = 1;
}

export class AwardXpDto {
  action: string;
  xpEarned: number;
  metadata?: Record<string, any>;
}

export interface RankInfo {
  name: string;
  emoji: string;
  minXp: number;
  maxXp: number;
  color: string;
}

export const RANKS: RankInfo[] = [
  { name: 'Wood', emoji: '🌲', minXp: 0, maxXp: 99, color: '#8B4513' },
  { name: 'Stone', emoji: '🪨', minXp: 100, maxXp: 249, color: '#808080' },
  { name: 'Copper', emoji: '🟠', minXp: 250, maxXp: 499, color: '#B87333' },
  { name: 'Bronze', emoji: '🥉', minXp: 500, maxXp: 999, color: '#CD7F32' },
  { name: 'Silver', emoji: '🥈', minXp: 1000, maxXp: 1999, color: '#C0C0C0' },
  { name: 'Gold', emoji: '🥇', minXp: 2000, maxXp: 4999, color: '#FFD700' },
  { name: 'Platinum', emoji: '💎', minXp: 5000, maxXp: 9999, color: '#E5E4E2' },
  { name: 'Diamond', emoji: '👑', minXp: 10000, maxXp: 999999, color: '#B9F2FF' },
];

export const ACHIEVEMENTS = [
  { name: 'First Quiz', description: 'Complete your first quiz', badgeIcon: '📝', badgeColor: '#4CAF50', xpReward: 50, criteriaType: 'quiz_complete', criteriaValue: 1 },
  { name: 'Quiz Master', description: 'Complete 10 quizzes', badgeIcon: '🏆', badgeColor: '#FF9800', xpReward: 200, criteriaType: 'quiz_complete', criteriaValue: 10 },
  { name: 'Perfect Score', description: 'Get 100% on a quiz', badgeIcon: '⭐', badgeColor: '#FFD700', xpReward: 100, criteriaType: 'perfect_score', criteriaValue: 1 },
  { name: 'Flashcard Learner', description: 'Review 50 flashcards', badgeIcon: '🃏', badgeColor: '#2196F3', xpReward: 100, criteriaType: 'flashcard_review', criteriaValue: 50 },
  { name: 'Flashcard Master', description: 'Review 500 flashcards', badgeIcon: '👑', badgeColor: '#9C27B0', xpReward: 500, criteriaType: 'flashcard_review', criteriaValue: 500 },
  { name: '7 Day Streak', description: 'Study for 7 days in a row', badgeIcon: '🔥', badgeColor: '#FF5722', xpReward: 100, criteriaType: 'study_streak', criteriaValue: 7 },
  { name: '30 Day Streak', description: 'Study for 30 days in a row', badgeIcon: '⚡', badgeColor: '#FFC107', xpReward: 500, criteriaType: 'study_streak', criteriaValue: 30 },
  { name: 'Note Taker', description: 'Create 10 notes', badgeIcon: '📓', badgeColor: '#607D8B', xpReward: 50, criteriaType: 'note_created', criteriaValue: 10 },
  { name: 'Note Master', description: 'Create 100 notes', badgeIcon: '📚', badgeColor: '#795548', xpReward: 500, criteriaType: 'note_created', criteriaValue: 100 },
  { name: 'Question Solver', description: 'Answer 100 questions correctly', badgeIcon: '✅', badgeColor: '#8BC34A', xpReward: 200, criteriaType: 'questions_solved', criteriaValue: 100 },
  { name: 'AI Explorer', description: 'Have 10 conversations with AI Tutor', badgeIcon: '🤖', badgeColor: '#03A9F4', xpReward: 150, criteriaType: 'ai_conversation', criteriaValue: 10 },
  { name: 'Early Bird', description: 'Study before 9 AM (5 times)', badgeIcon: '🌅', badgeColor: '#FF9800', xpReward: 25, criteriaType: 'early_study', criteriaValue: 5 },
  { name: 'Night Owl', description: 'Study after 11 PM (5 times)', badgeIcon: '🌙', badgeColor: '#3F51B5', xpReward: 25, criteriaType: 'night_study', criteriaValue: 5 },
];