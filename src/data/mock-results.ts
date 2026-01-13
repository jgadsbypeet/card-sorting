/**
 * Mock Data for Results Dashboard Development
 * 
 * This simulates data from 25 participants completing a card sorting study.
 */

import { v4 as uuidv4 } from 'uuid';
import { SortingSession, Study } from '@/types/results';
import { Card, Category, SAMPLE_CARDS } from '@/types';

// Define some realistic category patterns participants might create
const CATEGORY_PATTERNS = [
  // Pattern 1: Finance-focused
  { name: 'Finance', cards: ['card-1', 'card-2', 'card-9'] },
  { name: 'Communication', cards: ['card-3', 'card-4', 'card-12'] },
  { name: 'Project Management', cards: ['card-5', 'card-6', 'card-8'] },
  { name: 'Storage', cards: ['card-7'] },
  { name: 'Business Tools', cards: ['card-10', 'card-11'] },
  
  // Pattern 2: Task-focused
  { name: 'Money & Billing', cards: ['card-1', 'card-2', 'card-9'] },
  { name: 'Team Collaboration', cards: ['card-3', 'card-4', 'card-5'] },
  { name: 'Planning & Tracking', cards: ['card-6', 'card-8'] },
  { name: 'Files & Data', cards: ['card-7', 'card-11'] },
  { name: 'External', cards: ['card-10', 'card-12'] },
  
  // Pattern 3: More granular
  { name: 'Budgeting', cards: ['card-1', 'card-9'] },
  { name: 'Invoicing', cards: ['card-2'] },
  { name: 'Messaging', cards: ['card-3', 'card-12'] },
  { name: 'Meetings', cards: ['card-4'] },
  { name: 'Tasks', cards: ['card-5', 'card-6'] },
  { name: 'Scheduling', cards: ['card-8'] },
  { name: 'Documents', cards: ['card-7'] },
  { name: 'Analytics', cards: ['card-11'] },
  { name: 'Client Facing', cards: ['card-10'] },
];

// Helper to pick random elements
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper to add some randomness to card assignments
function addVariation(baseCards: string[], allCards: string[], variationChance = 0.2): string[] {
  const result = [...baseCards];
  
  // Occasionally move a card to a different category
  if (Math.random() < variationChance && result.length > 1) {
    result.pop();
  }
  
  // Occasionally add a card from elsewhere
  if (Math.random() < variationChance) {
    const available = allCards.filter(c => !result.includes(c));
    if (available.length > 0) {
      result.push(available[Math.floor(Math.random() * available.length)]);
    }
  }
  
  return result;
}

// Generate a mock session
function generateMockSession(
  studyId: string,
  participantNum: number,
  cards: Card[]
): SortingSession {
  const sessionId = uuidv4();
  const startTime = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000; // Within last week
  const duration = 120000 + Math.random() * 600000; // 2-12 minutes
  
  // Pick a pattern with some variation
  const patternStart = Math.floor(Math.random() * 3) * 5; // 0, 5, or 10
  const patternCategories = CATEGORY_PATTERNS.slice(patternStart, patternStart + 5);
  
  // Create categories with variations
  const categories: Category[] = patternCategories.map((pattern, idx) => ({
    id: `cat-${sessionId}-${idx}`,
    name: pattern.name,
    cardIds: addVariation(pattern.cards, cards.map(c => c.id)),
    isUserCreated: true,
  }));
  
  // Build placements from categories
  const placements = categories.flatMap((cat, catIdx) =>
    cat.cardIds.map((cardId, pos) => {
      const card = cards.find(c => c.id === cardId);
      return {
        cardId,
        cardLabel: card?.label || cardId,
        categoryId: cat.id,
        categoryName: cat.name,
        position: pos,
        placedAt: startTime + Math.random() * duration,
      };
    })
  );
  
  // Determine completion (90% complete)
  const isCompleted = Math.random() > 0.1;
  
  return {
    id: sessionId,
    studyId,
    participant: {
      id: uuidv4(),
      displayId: `P${participantNum.toString().padStart(3, '0')}`,
      startedAt: startTime,
      completedAt: isCompleted ? startTime + duration : null,
      duration: isCompleted ? duration : null,
      accessibilityMode: pickRandom(['mouse', 'keyboard', 'screen-reader', 'touch'] as const, 1)[0],
    },
    mode: 'open',
    cards,
    categories,
    placements,
    userCreatedCategories: categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      createdAt: startTime + Math.random() * 10000,
    })),
    actionLog: [],
    metadata: {
      completionRate: placements.length / cards.length,
      totalMoves: Math.floor(15 + Math.random() * 20),
      undoCount: Math.floor(Math.random() * 5),
      screenWidth: [1920, 1440, 1366, 768][Math.floor(Math.random() * 4)],
      screenHeight: [1080, 900, 768, 1024][Math.floor(Math.random() * 4)],
    },
  };
}

// Generate mock study
export const MOCK_STUDY: Study = {
  id: 'study-001',
  name: 'Product Feature Organization Study',
  description: 'Help us understand how users mentally organize product features.',
  mode: 'open',
  cards: SAMPLE_CARDS,
  settings: {
    allowUndo: true,
    showProgress: true,
    requireAllCardsSorted: false,
    timeLimit: null,
    randomizeCards: true,
    instructions: 'Please sort these product features into groups that make sense to you. Create as many categories as you need.',
  },
  createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
  updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  status: 'active',
};

// Generate 25 mock sessions
export const MOCK_SESSIONS: SortingSession[] = Array.from(
  { length: 25 },
  (_, i) => generateMockSession(MOCK_STUDY.id, i + 1, SAMPLE_CARDS)
);

// Pre-computed analysis results for faster loading
export function getMockAnalysisResults() {
  // Import dynamically to avoid circular deps
  const { runFullAnalysis } = require('@/lib/analysis');
  return runFullAnalysis(MOCK_STUDY.id, MOCK_STUDY.name, MOCK_SESSIONS, SAMPLE_CARDS);
}
