import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/studies/by-slug/[slug] - Get a study by slug (public, for participants)
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
      return NextResponse.json(
        { error: 'This study is not currently accepting responses' },
        { status: 403 }
      );
    }

    // Return only necessary data for participants (no sensitive info)
    const publicStudy = {
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
      cards: study.cards.map(c => ({
        id: c.id,
        label: c.label,
        description: c.description,
      })),
      categories: study.categories.map(c => ({
        id: c.id,
        name: c.name,
      })),
    };

    return NextResponse.json(publicStudy);
  } catch (error) {
    console.error('Error fetching study:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study' },
      { status: 500 }
    );
  }
}
