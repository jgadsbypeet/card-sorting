/**
 * Card Sorting Analysis Utilities
 * 
 * Functions for computing similarity matrices, hierarchical clustering,
 * and generating insights from card sorting session data.
 */

import {
  SortingSession,
  SimilarityMatrix,
  SimilarityCell,
  DendrogramNode,
  ClusterAnalysis,
  CategoryAnalysis,
  CardPlacementSummary,
  AnalysisResults,
} from '@/types/results';
import { Card } from '@/types';

// ============================================================================
// Similarity Matrix Computation
// ============================================================================

/**
 * Compute similarity matrix from sorting sessions
 * Similarity = (co-occurrences) / (total participants)
 */
export function computeSimilarityMatrix(
  sessions: SortingSession[],
  cards: Card[]
): SimilarityMatrix {
  const n = cards.length;
  const cardIds = cards.map(c => c.id);
  const cardLabels = cards.map(c => c.label);
  
  // Initialize co-occurrence matrix
  const coOccurrences: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // For each session, find co-occurring cards
  for (const session of sessions) {
    // Build category -> cards map
    const categoryCards: Map<string, Set<string>> = new Map();
    
    for (const placement of session.placements) {
      if (!categoryCards.has(placement.categoryId)) {
        categoryCards.set(placement.categoryId, new Set());
      }
      categoryCards.get(placement.categoryId)!.add(placement.cardId);
    }
    
    // Count co-occurrences within each category
    for (const cardSet of categoryCards.values()) {
      const cardArray = Array.from(cardSet);
      for (let i = 0; i < cardArray.length; i++) {
        for (let j = i + 1; j < cardArray.length; j++) {
          const idxA = cardIds.indexOf(cardArray[i]);
          const idxB = cardIds.indexOf(cardArray[j]);
          if (idxA !== -1 && idxB !== -1) {
            coOccurrences[idxA][idxB]++;
            coOccurrences[idxB][idxA]++;
          }
        }
      }
    }
  }
  
  // Compute similarity scores (0-1)
  const participantCount = sessions.length;
  const matrix: number[][] = coOccurrences.map(row =>
    row.map(count => participantCount > 0 ? count / participantCount : 0)
  );
  
  // Set diagonal to 1 (card is always similar to itself)
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
  }
  
  return {
    cardIds,
    cardLabels,
    matrix,
    participantCount,
  };
}

/**
 * Get all similarity cells for table view
 */
export function getSimilarityCells(
  similarityMatrix: SimilarityMatrix
): SimilarityCell[] {
  const cells: SimilarityCell[] = [];
  const { cardIds, cardLabels, matrix, participantCount } = similarityMatrix;
  
  for (let i = 0; i < cardIds.length; i++) {
    for (let j = i + 1; j < cardIds.length; j++) {
      cells.push({
        cardA: { id: cardIds[i], label: cardLabels[i] },
        cardB: { id: cardIds[j], label: cardLabels[j] },
        coOccurrences: Math.round(matrix[i][j] * participantCount),
        totalPairings: participantCount,
        similarity: matrix[i][j],
      });
    }
  }
  
  // Sort by similarity descending
  return cells.sort((a, b) => b.similarity - a.similarity);
}

// ============================================================================
// Hierarchical Clustering (for Dendrogram)
// ============================================================================

interface ClusterNode {
  id: string;
  items: string[];
  children?: ClusterNode[];
  distance: number;
}

/**
 * Compute hierarchical clustering using average linkage
 */
export function computeHierarchicalClustering(
  similarityMatrix: SimilarityMatrix
): ClusterAnalysis {
  const { cardIds, cardLabels, matrix } = similarityMatrix;
  const n = cardIds.length;
  
  // Convert similarity to distance (1 - similarity)
  const distanceMatrix: number[][] = matrix.map(row =>
    row.map(sim => 1 - sim)
  );
  
  // Initialize clusters (each card is its own cluster)
  let clusters: ClusterNode[] = cardIds.map((id, i) => ({
    id,
    items: [id],
    distance: 0,
  }));
  
  // Current distance matrix (will be modified)
  const currentDist: number[][] = distanceMatrix.map(row => [...row]);
  
  // Merge history for building dendrogram
  const mergeHistory: { merged: [number, number]; distance: number; newCluster: ClusterNode }[] = [];
  
  // Agglomerative clustering
  while (clusters.length > 1) {
    // Find minimum distance pair
    let minDist = Infinity;
    let minI = 0;
    let minJ = 1;
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (currentDist[i][j] < minDist) {
          minDist = currentDist[i][j];
          minI = i;
          minJ = j;
        }
      }
    }
    
    // Merge clusters
    const newCluster: ClusterNode = {
      id: `cluster-${clusters.length}-${Date.now()}`,
      items: [...clusters[minI].items, ...clusters[minJ].items],
      children: [clusters[minI], clusters[minJ]],
      distance: minDist,
    };
    
    mergeHistory.push({
      merged: [minI, minJ],
      distance: minDist,
      newCluster,
    });
    
    // Update distance matrix (average linkage)
    const newDistances: number[] = [];
    for (let k = 0; k < clusters.length; k++) {
      if (k !== minI && k !== minJ) {
        const avgDist = (currentDist[minI][k] + currentDist[minJ][k]) / 2;
        newDistances.push(avgDist);
      }
    }
    
    // Remove merged clusters and add new one
    const newClusters = clusters.filter((_, i) => i !== minI && i !== minJ);
    newClusters.push(newCluster);
    
    // Rebuild distance matrix
    const newDist: number[][] = [];
    let newIdx = 0;
    for (let i = 0; i < clusters.length; i++) {
      if (i === minI || i === minJ) continue;
      const row: number[] = [];
      let colIdx = 0;
      for (let j = 0; j < clusters.length; j++) {
        if (j === minI || j === minJ) continue;
        row.push(currentDist[i][j]);
        colIdx++;
      }
      row.push(newDistances[newIdx]);
      newDist.push(row);
      newIdx++;
    }
    // Add row for new cluster
    newDist.push([...newDistances, 0]);
    
    clusters = newClusters;
    currentDist.length = 0;
    currentDist.push(...newDist);
  }
  
  // Build dendrogram tree
  const root = buildDendrogramTree(clusters[0], cardIds, cardLabels);
  
  // Generate suggested clusters at different thresholds
  const suggestedClusters = generateSuggestedClusters(mergeHistory, cardIds, cardLabels);
  
  return {
    root,
    suggestedClusters,
  };
}

function buildDendrogramTree(
  cluster: ClusterNode,
  cardIds: string[],
  cardLabels: string[]
): DendrogramNode {
  if (!cluster.children) {
    // Leaf node
    const labelIdx = cardIds.indexOf(cluster.id);
    return {
      id: cluster.id,
      name: labelIdx !== -1 ? cardLabels[labelIdx] : cluster.id,
      cardId: cluster.id,
      value: 0,
    };
  }
  
  return {
    id: cluster.id,
    name: `Cluster`,
    children: cluster.children.map(child => buildDendrogramTree(child, cardIds, cardLabels)),
    value: cluster.distance,
  };
}

function generateSuggestedClusters(
  mergeHistory: { merged: [number, number]; distance: number; newCluster: ClusterNode }[],
  cardIds: string[],
  cardLabels: string[]
): ClusterAnalysis['suggestedClusters'] {
  const thresholds = [0.3, 0.5, 0.7];
  
  return thresholds.map(threshold => {
    // Find clusters at this threshold by cutting the dendrogram
    const clusters: { id: string; name: string; cardIds: string[]; cardLabels: string[] }[] = [];
    
    // Start with individual items
    let currentClusters = cardIds.map(id => ({
      id,
      items: [id],
    }));
    
    // Apply merges up to threshold
    for (const merge of mergeHistory) {
      if (merge.distance <= threshold) {
        const [i, j] = merge.merged;
        const newCluster = {
          id: merge.newCluster.id,
          items: merge.newCluster.items,
        };
        currentClusters = currentClusters.filter((_, idx) => idx !== i && idx !== j);
        currentClusters.push(newCluster);
      }
    }
    
    return {
      threshold,
      clusters: currentClusters.map((c, i) => ({
        id: c.id,
        name: `Cluster ${i + 1}`,
        cardIds: c.items,
        cardLabels: c.items.map(id => {
          const idx = cardIds.indexOf(id);
          return idx !== -1 ? cardLabels[idx] : id;
        }),
      })),
    };
  });
}

// ============================================================================
// Category Analysis (Open Sorting)
// ============================================================================

export function analyzeCategoryUsage(
  sessions: SortingSession[]
): CategoryAnalysis {
  // Collect all category names (normalized)
  const categoryUsage: Map<string, {
    originalNames: Set<string>;
    frequency: number;
    cardCounts: Map<string, number>;
  }> = new Map();
  
  for (const session of sessions) {
    for (const category of session.categories) {
      const normalizedName = normalizeCategory(category.name);
      
      if (!categoryUsage.has(normalizedName)) {
        categoryUsage.set(normalizedName, {
          originalNames: new Set(),
          frequency: 0,
          cardCounts: new Map(),
        });
      }
      
      const usage = categoryUsage.get(normalizedName)!;
      usage.originalNames.add(category.name);
      usage.frequency++;
      
      // Count cards in this category
      const placements = session.placements.filter(p => p.categoryId === category.id);
      for (const placement of placements) {
        const current = usage.cardCounts.get(placement.cardId) || 0;
        usage.cardCounts.set(placement.cardId, current + 1);
      }
    }
  }
  
  // Build standardized categories
  const standardizedCategories = Array.from(categoryUsage.entries())
    .map(([name, data]) => {
      const topCards = Array.from(data.cardCounts.entries())
        .map(([cardId, count]) => {
          const session = sessions.find(s => s.cards.some(c => c.id === cardId));
          const card = session?.cards.find(c => c.id === cardId);
          return {
            cardId,
            cardLabel: card?.label || cardId,
            frequency: count,
            percentage: (count / data.frequency) * 100,
          };
        })
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);
      
      return {
        name,
        originalNames: Array.from(data.originalNames),
        frequency: data.frequency,
        topCards,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);
  
  return { standardizedCategories };
}

function normalizeCategory(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

// ============================================================================
// Card Placement Analysis
// ============================================================================

export function analyzeCardPlacements(
  sessions: SortingSession[],
  cards: Card[]
): CardPlacementSummary[] {
  return cards.map(card => {
    const placements: Map<string, number> = new Map();
    let totalPlacements = 0;
    
    for (const session of sessions) {
      const placement = session.placements.find(p => p.cardId === card.id);
      if (placement) {
        const categoryName = normalizeCategory(placement.categoryName);
        placements.set(categoryName, (placements.get(categoryName) || 0) + 1);
        totalPlacements++;
      }
    }
    
    const placementArray = Array.from(placements.entries())
      .map(([categoryName, count]) => ({
        categoryName,
        count,
        percentage: totalPlacements > 0 ? (count / totalPlacements) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
    
    // Agreement score: how concentrated placements are (1 = all same category)
    const maxPercentage = placementArray[0]?.percentage || 0;
    const agreementScore = maxPercentage / 100;
    
    return {
      cardId: card.id,
      cardLabel: card.label,
      placements: placementArray,
      agreementScore,
      primaryCategory: placementArray[0]?.categoryName || 'Unplaced',
    };
  });
}

// ============================================================================
// Insight Generation
// ============================================================================

export function generateInsights(
  similarityMatrix: SimilarityMatrix,
  cardSummaries: CardPlacementSummary[]
): AnalysisResults['insights'] {
  const insights: AnalysisResults['insights'] = [];
  
  // Find strong clusters (high similarity pairs)
  const cells = getSimilarityCells(similarityMatrix);
  const strongPairs = cells.filter(c => c.similarity >= 0.8);
  if (strongPairs.length > 0) {
    const topPair = strongPairs[0];
    insights.push({
      type: 'strong_cluster',
      message: `"${topPair.cardA.label}" and "${topPair.cardB.label}" were sorted together ${Math.round(topPair.similarity * 100)}% of the time, indicating a strong conceptual relationship.`,
      relatedCards: [topPair.cardA.id, topPair.cardB.id],
      confidence: topPair.similarity,
    });
  }
  
  // Find ambiguous cards (low agreement)
  const ambiguousCards = cardSummaries.filter(c => c.agreementScore < 0.4);
  for (const card of ambiguousCards.slice(0, 2)) {
    insights.push({
      type: 'ambiguous_card',
      message: `"${card.cardLabel}" shows low placement agreement (${Math.round(card.agreementScore * 100)}%). Consider reviewing this item's clarity or scope.`,
      relatedCards: [card.cardId],
      confidence: 1 - card.agreementScore,
    });
  }
  
  // Find high consensus cards
  const consensusCards = cardSummaries.filter(c => c.agreementScore >= 0.9);
  if (consensusCards.length >= 3) {
    insights.push({
      type: 'consensus',
      message: `${consensusCards.length} cards show very high placement agreement (>90%), suggesting clear user mental models for these items.`,
      relatedCards: consensusCards.map(c => c.cardId),
      confidence: 0.9,
    });
  }
  
  return insights;
}

// ============================================================================
// Full Analysis Pipeline
// ============================================================================

export function runFullAnalysis(
  studyId: string,
  studyName: string,
  sessions: SortingSession[],
  cards: Card[]
): AnalysisResults {
  const completedSessions = sessions.filter(s => s.participant.completedAt !== null);
  
  const similarityMatrix = computeSimilarityMatrix(completedSessions, cards);
  const clusterAnalysis = computeHierarchicalClustering(similarityMatrix);
  const categoryAnalysis = analyzeCategoryUsage(completedSessions);
  const cardSummaries = analyzeCardPlacements(completedSessions, cards);
  const insights = generateInsights(similarityMatrix, cardSummaries);
  
  const durations = completedSessions
    .map(s => s.participant.duration)
    .filter((d): d is number => d !== null);
  const averageDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  
  return {
    studyId,
    studyName,
    analyzedAt: Date.now(),
    participantCount: completedSessions.length,
    completionRate: sessions.length > 0 ? completedSessions.length / sessions.length : 0,
    averageDuration,
    similarityMatrix,
    clusterAnalysis,
    categoryAnalysis,
    cardSummaries,
    insights,
  };
}
