import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// POST /api/sessions/[sessionId]/placements - Save card placements
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    const session = await prisma.participantSession.findUnique({
      where: { id: sessionId },
      include: { study: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }

    const { placements, createdCategories } = body;

    // Use a transaction to update all placements atomically
    await prisma.$transaction(async (tx) => {
      // Delete existing placements
      await tx.cardPlacement.deleteMany({
        where: { sessionId },
      });

      // Delete existing created categories (for open sorting)
      if (session.study.mode === 'OPEN') {
        await tx.createdCategory.deleteMany({
          where: { sessionId },
        });

        // Create new categories
        if (createdCategories && createdCategories.length > 0) {
          await tx.createdCategory.createMany({
            data: createdCategories.map((cat: { id: string; name: string }, index: number) => ({
              id: cat.id,
              name: cat.name,
              sortOrder: index,
              sessionId,
            })),
          });
        }
      }

      // Create new placements
      if (placements && placements.length > 0) {
        await tx.cardPlacement.createMany({
          data: placements.map((p: { 
            cardId: string; 
            categoryId: string; 
            categoryName: string; 
            position: number 
          }) => ({
            cardId: p.cardId,
            sessionId,
            createdCategoryId: session.study.mode === 'OPEN' ? p.categoryId : null,
            categoryName: p.categoryName,
            position: p.position,
          })),
        });
      }

      // Update move count
      await tx.participantSession.update({
        where: { id: sessionId },
        data: {
          totalMoves: { increment: 1 },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving placements:', error);
    return NextResponse.json({ error: 'Failed to save placements' }, { status: 500 });
  }
}
