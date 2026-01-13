import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// GET /api/sessions/[sessionId] - Get session data (for resuming)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const session = await prisma.participantSession.findUnique({
      where: { id: sessionId },
      include: {
        study: {
          include: {
            cards: { orderBy: { sortOrder: 'asc' } },
            categories: { orderBy: { sortOrder: 'asc' } },
          },
        },
        placements: true,
        createdCategories: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        displayId: session.displayId,
        status: session.status,
        startedAt: session.startedAt,
        totalMoves: session.totalMoves,
        undoCount: session.undoCount,
      },
      study: {
        id: session.study.id,
        name: session.study.name,
        mode: session.study.mode,
        cards: session.study.cards.map(c => ({
          id: c.id,
          label: c.label,
          description: c.description,
        })),
        categories: session.study.mode === 'CLOSED' 
          ? session.study.categories.map(c => ({ id: c.id, name: c.name }))
          : [],
        settings: {
          allowUndo: session.study.allowUndo,
          showProgress: session.study.showProgress,
          requireAllCardsSorted: session.study.requireAllCardsSorted,
        },
      },
      placements: session.placements.map(p => ({
        cardId: p.cardId,
        categoryId: p.createdCategoryId || p.categoryName,
        categoryName: p.categoryName,
        position: p.position,
      })),
      createdCategories: session.createdCategories.map(c => ({
        id: c.id,
        name: c.name,
      })),
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// PATCH /api/sessions/[sessionId] - Update session (complete, abandon, update stats)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    const session = await prisma.participantSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status === 'COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      updateData.durationMs = Date.now() - session.startedAt.getTime();

      // Log completion
      await prisma.sessionAction.create({
        data: {
          sessionId,
          type: 'COMPLETE_SESSION',
          details: {
            duration: updateData.durationMs as number,
            totalMoves: session.totalMoves,
            undoCount: session.undoCount,
          },
        },
      });
    }

    if (body.status === 'ABANDONED') {
      updateData.status = 'ABANDONED';
    }

    if (body.totalMoves !== undefined) {
      updateData.totalMoves = body.totalMoves;
    }

    if (body.undoCount !== undefined) {
      updateData.undoCount = body.undoCount;
    }

    if (body.accessibilityMode) {
      updateData.accessibilityMode = body.accessibilityMode;
    }

    const updated = await prisma.participantSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
