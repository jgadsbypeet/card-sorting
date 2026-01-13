/**
 * Data Schema for Card Sorting Results
 * 
 * This schema defines how card sorting session data is stored and analyzed.
 * It supports both open and closed sorting modes and tracks all participant actions.
 */

import { Card, Category, SortingMode } from './index';

// ============================================================================
// Session & Participant Types
// ============================================================================

export interface Participant {
  id: string;
  /** Optional anonymous identifier for display */
  displayId: string;
  /** Session start timestamp */
  startedAt: number;
  /** Session completion timestamp (null if abandoned) */
  completedAt: number | null;
  /** Duration in milliseconds */
  duration: number | null;
  /** User agent for device analysis */
  userAgent?: string;
  /** Accessibility mode used (keyboard, screen reader, etc.) */
  accessibilityMode?: 'mouse' | 'keyboard' | 'screen-reader' | 'touch';
}

export interface CardPlacement {
  cardId: string;
  cardLabel: string;
  categoryId: string;
  categoryName: string;
  /** Position within the category (0-indexed) */
  position: number;
  /** Timestamp when card was placed in this category */
  placedAt: number;
}

export interface SortingSession {
  id: string;
  /** Study this session belongs to */
  studyId: string;
  participant: Participant;
  mode: SortingMode;
  /** Original cards presented to participant */
  cards: Card[];
  /** Categories available (closed) or created (open) */
  categories: Category[];
  /** Final card placements */
  placements: CardPlacement[];
  /** Categories created by participant (open mode only) */
  userCreatedCategories?: {
    id: string;
    name: string;
    createdAt: number;
  }[];
  /** Full action history for replay/analysis */
  actionLog: SortingAction[];
  /** Session metadata */
  metadata: {
    browserLanguage?: string;
    screenWidth?: number;
    screenHeight?: number;
    completionRate: number; // 0-1
    totalMoves: number;
    undoCount: number;
  };
}

export interface SortingAction {
  type: 'move' | 'create_category' | 'rename_category' | 'delete_category' | 'undo';
  timestamp: number;
  details: Record<string, unknown>;
}

// ============================================================================
// Study Configuration Types
// ============================================================================

export interface Study {
  id: string;
  name: string;
  description?: string;
  mode: SortingMode;
  /** Cards to be sorted */
  cards: Card[];
  /** Pre-defined categories (closed mode) */
  predefinedCategories?: Omit<Category, 'cardIds'>[];
  /** Study settings */
  settings: {
    allowUndo: boolean;
    showProgress: boolean;
    requireAllCardsSorted: boolean;
    /** Maximum time in minutes (null = no limit) */
    timeLimit: number | null;
    /** Randomize card order per participant */
    randomizeCards: boolean;
    /** Custom instructions for participants */
    instructions?: string;
  };
  /** Creation and modification dates */
  createdAt: number;
  updatedAt: number;
  /** Status */
  status: 'draft' | 'active' | 'paused' | 'completed';
}

// ============================================================================
// Analysis Result Types
// ============================================================================

/**
 * Similarity Matrix
 * Shows how often pairs of cards were sorted into the same category
 */
export interface SimilarityMatrix {
  /** Card IDs in order */
  cardIds: string[];
  /** Card labels for display */
  cardLabels: string[];
  /** Matrix values: matrix[i][j] = similarity score (0-1) between cards i and j */
  matrix: number[][];
  /** Total number of participants analyzed */
  participantCount: number;
}

export interface SimilarityCell {
  cardA: {
    id: string;
    label: string;
  };
  cardB: {
    id: string;
    label: string;
  };
  /** Number of times cards were sorted together */
  coOccurrences: number;
  /** Total possible pairings (participant count) */
  totalPairings: number;
  /** Similarity score (0-1) */
  similarity: number;
}

/**
 * Dendrogram/Cluster Analysis
 * Hierarchical clustering of cards based on similarity
 */
export interface DendrogramNode {
  id: string;
  /** For leaf nodes: card label. For branch nodes: generated ID */
  name: string;
  /** Leaf nodes don't have children */
  children?: DendrogramNode[];
  /** Distance/height value for clustering */
  value?: number;
  /** Only for leaf nodes */
  cardId?: string;
}

export interface ClusterAnalysis {
  /** Root of the dendrogram tree */
  root: DendrogramNode;
  /** Suggested clusters at different similarity thresholds */
  suggestedClusters: {
    threshold: number;
    clusters: {
      id: string;
      name: string;
      cardIds: string[];
      cardLabels: string[];
    }[];
  }[];
}

/**
 * Category Frequency Analysis
 * How participants named and used categories (open sorting)
 */
export interface CategoryAnalysis {
  /** Standardized/merged category names */
  standardizedCategories: {
    name: string;
    /** Original names that were merged into this */
    originalNames: string[];
    /** Number of participants who created this category */
    frequency: number;
    /** Cards most commonly placed in this category */
    topCards: {
      cardId: string;
      cardLabel: string;
      frequency: number;
      percentage: number;
    }[];
  }[];
}

/**
 * Card Placement Summary
 * Per-card analysis of where it was placed
 */
export interface CardPlacementSummary {
  cardId: string;
  cardLabel: string;
  /** Categories this card was placed in */
  placements: {
    categoryName: string;
    count: number;
    percentage: number;
  }[];
  /** How "agreed upon" this card's placement was (0-1) */
  agreementScore: number;
  /** Most common placement */
  primaryCategory: string;
}

/**
 * Complete Analysis Results
 */
export interface AnalysisResults {
  studyId: string;
  studyName: string;
  analyzedAt: number;
  participantCount: number;
  completionRate: number;
  averageDuration: number;
  
  similarityMatrix: SimilarityMatrix;
  clusterAnalysis: ClusterAnalysis;
  categoryAnalysis: CategoryAnalysis;
  cardSummaries: CardPlacementSummary[];
  
  /** Key insights generated from analysis */
  insights: {
    type: 'strong_cluster' | 'ambiguous_card' | 'category_confusion' | 'consensus';
    message: string;
    relatedCards?: string[];
    confidence: number;
  }[];
}

// ============================================================================
// Export/Import Types
// ============================================================================

export interface ExportFormat {
  version: '1.0';
  exportedAt: number;
  study: Study;
  sessions: SortingSession[];
  analysis?: AnalysisResults;
}
