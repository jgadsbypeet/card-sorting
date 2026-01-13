import { NextRequest, NextResponse } from 'next/server';
import { demoStudies, DEMO_MODE } from '../../route';
import { computeHierarchicalClustering } from '@/lib/analysis';

interface RouteParams {
  params: Promise<{ studyId: string }>;
}

// GET /api/studies/[studyId]/results - Get analysis results
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studyId } = await params;

    if (DEMO_MODE) {
      const study = demoStudies.get(studyId);
      if (!study) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }

      // Generate demo results
      const cards = study.cards.map(c => ({
        id: c.id,
        label: c.label,
        description: c.description,
      }));

      // Create a demo similarity matrix
      const n = cards.length;
      const matrix: number[][] = [];
      for (let i = 0; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            row.push(1);
          } else {
            // Generate random similarity for demo
            row.push(Math.random() * 0.8);
          }
        }
        matrix.push(row);
      }
      // Make matrix symmetric
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          matrix[j][i] = matrix[i][j];
        }
      }

      const similarityMatrix = {
        cardIds: cards.map(c => c.id),
        cardLabels: cards.map(c => c.label),
        matrix,
        participantCount: 0,
      };

      // Generate card summaries
      const cardSummaries = cards.map(card => ({
        cardId: card.id,
        cardLabel: card.label,
        placements: [],
        agreementScore: 0,
        primaryCategory: 'No data yet',
      }));

      const results = {
        studyId: study.id,
        studyName: study.name,
        mode: study.mode,
        analyzedAt: Date.now(),
        participantCount: study._count.sessions,
        totalSessions: study._count.sessions,
        completionRate: 0,
        averageDuration: 0,
        cards,
        similarityMatrix,
        cardSummaries,
        insights: study._count.sessions === 0 ? [{
          type: 'consensus',
          message: 'No participant responses yet. Share your study link to start collecting data.',
          confidence: 1,
        }] : [],
      };

      return NextResponse.json(results);
    }

    // Database mode
    const { prisma } = await import('@/lib/db');
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    
    let userId: string;
    if (!session?.user) {
      const demoUser = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
      if (!demoUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = demoUser.id;
    } else {
      userId = (session.user as { id: string }).id;
    }

    // Fetch study with all related data for analysis
    const study = await prisma.study.findFirst({
      where: {
        id: studyId,
        ownerId: userId,
      },
      include: {
        cards: { orderBy: { sortOrder: 'asc' } },
        categories: { orderBy: { sortOrder: 'asc' } },
        sessions: {
          where: { status: 'COMPLETED' },
          include: {
            placements: {
              include: {
                card: true,
                createdCategory: true,
              },
            },
            createdCategories: true,
          },
        },
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    // Transform data for analysis
    const cards = study.cards.map(card => ({
      id: card.id,
      label: card.label,
      description: card.description,
    }));

    const sessions = study.sessions.map(session => ({
      id: session.id,
      displayId: session.displayId,
      startedAt: session.startedAt.getTime(),
      completedAt: session.completedAt?.getTime() || null,
      duration: session.durationMs,
      accessibilityMode: session.accessibilityMode?.toLowerCase() || null,
      totalMoves: session.totalMoves,
      undoCount: session.undoCount,
      placements: session.placements.map(p => ({
        cardId: p.cardId,
        cardLabel: p.card.label,
        categoryId: p.createdCategoryId || p.categoryName,
        categoryName: p.categoryName,
        position: p.position,
        placedAt: p.placedAt.getTime(),
      })),
      categories: session.createdCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        cardIds: session.placements
          .filter(p => p.createdCategoryId === cat.id)
          .map(p => p.cardId),
      })),
    }));

    // Compute basic stats
    const completedSessions = sessions.filter(s => s.completedAt);
    const averageDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;

    // Compute similarity matrix
    const similarityMatrix = computeSimilarityMatrix(sessions, cards);
    
    // Compute card summaries
    const cardSummaries = computeCardSummaries(sessions, cards);

    // Generate insights
    const insights = generateInsights(similarityMatrix, cardSummaries);

    const results = {
      studyId: study.id,
      studyName: study.name,
      mode: study.mode,
      analyzedAt: Date.now(),
      participantCount: completedSessions.length,
      totalSessions: study.sessions.length,
      completionRate: study.sessions.length > 0 
        ? completedSessions.length / study.sessions.length 
        : 0,
      averageDuration,
      cards,
      similarityMatrix,
      cardSummaries,
      insights,
      // Raw data for custom analysis
      rawSessions: sessions,
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

// Helper: Compute similarity matrix
function computeSimilarityMatrix(
  sessions: Array<{
    placements: Array<{ cardId: string; categoryName: string }>;
  }>,
  cards: Array<{ id: string; label: string }>
) {
  const n = cards.length;
  const cardIds = cards.map(c => c.id);
  const cardLabels = cards.map(c => c.label);
  
  // Initialize matrix
  const coOccurrences: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Count co-occurrences
  for (const session of sessions) {
    const categoryCards: Map<string, string[]> = new Map();
    
    for (const placement of session.placements) {
      if (!categoryCards.has(placement.categoryName)) {
        categoryCards.set(placement.categoryName, []);
      }
      categoryCards.get(placement.categoryName)!.push(placement.cardId);
    }
    
    for (const cardArray of categoryCards.values()) {
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
  
  // Compute similarity scores
  const participantCount = sessions.length;
  const matrix = coOccurrences.map(row =>
    row.map(count => participantCount > 0 ? count / participantCount : 0)
  );
  
  // Set diagonal to 1
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
  }
  
  return { cardIds, cardLabels, matrix, participantCount };
}

// Helper: Compute card summaries
function computeCardSummaries(
  sessions: Array<{
    placements: Array<{ cardId: string; cardLabel: string; categoryName: string }>;
  }>,
  cards: Array<{ id: string; label: string }>
) {
  return cards.map(card => {
    const placements: Map<string, number> = new Map();
    let totalPlacements = 0;
    
    for (const session of sessions) {
      const placement = session.placements.find(p => p.cardId === card.id);
      if (placement) {
        const categoryName = placement.categoryName.toLowerCase().trim();
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
    
    const maxPercentage = placementArray[0]?.percentage || 0;
    
    return {
      cardId: card.id,
      cardLabel: card.label,
      placements: placementArray,
      agreementScore: maxPercentage / 100,
      primaryCategory: placementArray[0]?.categoryName || 'Unplaced',
    };
  });
}

// Helper: Generate insights
function generateInsights(
  similarityMatrix: { cardLabels: string[]; matrix: number[][] },
  cardSummaries: Array<{ cardLabel: string; agreementScore: number }>
) {
  const insights: Array<{
    type: string;
    message: string;
    confidence: number;
  }> = [];
  
  // Find strong pairs
  const { cardLabels, matrix } = similarityMatrix;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      if (matrix[i][j] >= 0.8) {
        insights.push({
          type: 'strong_cluster',
          message: `"${cardLabels[i]}" and "${cardLabels[j]}" were sorted together ${Math.round(matrix[i][j] * 100)}% of the time.`,
          confidence: matrix[i][j],
        });
        break;
      }
    }
    if (insights.some(i => i.type === 'strong_cluster')) break;
  }
  
  // Find ambiguous cards
  const ambiguous = cardSummaries.filter(c => c.agreementScore < 0.4);
  if (ambiguous.length > 0) {
    insights.push({
      type: 'ambiguous_card',
      message: `"${ambiguous[0].cardLabel}" shows low placement agreement (${Math.round(ambiguous[0].agreementScore * 100)}%). Consider reviewing this item.`,
      confidence: 1 - ambiguous[0].agreementScore,
    });
  }
  
  // High consensus
  const consensus = cardSummaries.filter(c => c.agreementScore >= 0.9);
  if (consensus.length >= 3) {
    insights.push({
      type: 'consensus',
      message: `${consensus.length} cards show very high placement agreement (>90%), indicating clear mental models.`,
      confidence: 0.9,
    });
  }
  
  return insights;
}
