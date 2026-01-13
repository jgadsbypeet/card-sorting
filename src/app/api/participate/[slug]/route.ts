import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/participate/[slug] - Get study for participant (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const study = await prisma.study.findUnique({
      where: { slug },
      include: {
        cards: { orderBy: { sortOrder: 'asc' } },
        categories: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    if (study.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'This study is not currently accepting responses',
        status: study.status,
      }, { status: 403 });
    }

    // Return only what participants need (no sensitive data)
    const participantStudy = {
      id: study.id,
      name: study.name,
      description: study.description,
      mode: study.mode,
      instructions: study.instructions,
      thankYouMessage: study.thankYouMessage,
      settings: {
        allowUndo: study.allowUndo,
        showProgress: study.showProgress,
        requireAllCardsSorted: study.requireAllCardsSorted,
        randomizeCards: study.randomizeCards,
        timeLimitMinutes: study.timeLimitMinutes,
      },
      cards: study.randomizeCards 
        ? shuffleArray(study.cards.map(c => ({
            id: c.id,
            label: c.label,
            description: c.description,
          })))
        : study.cards.map(c => ({
            id: c.id,
            label: c.label,
            description: c.description,
          })),
      categories: study.mode === 'CLOSED' 
        ? study.categories.map(c => ({
            id: c.id,
            name: c.name,
          }))
        : [],
    };

    return NextResponse.json(participantStudy);
  } catch (error) {
    console.error('Error fetching study for participant:', error);
    return NextResponse.json({ error: 'Failed to load study' }, { status: 500 });
  }
}

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
