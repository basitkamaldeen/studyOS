import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
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

async function main() {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement,
    });
  }
  console.log('✅ Achievements seeded successfully!');
  console.log(`📊 Seeded ${ACHIEVEMENTS.length} achievements`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());