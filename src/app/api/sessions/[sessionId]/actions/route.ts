import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// POST /api/sessions/[sessionId]/actions - Log participant actions
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    const session = await prisma.participantSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { type, details } = body;

    // Validate action type
    const validTypes = [
      'MOVE_CARD',
      'CREATE_CATEGORY',
      'RENAME_CATEGORY',
      'DELETE_CATEGORY',
      'UNDO',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    // Create action log
    const action = await prisma.sessionAction.create({
      data: {
        sessionId,
        type,
        details: details || {},
      },
    });

    // Update undo count if applicable
    if (type === 'UNDO') {
      await prisma.participantSession.update({
        where: { id: sessionId },
        data: {
          undoCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Error logging action:', error);
    return NextResponse.json({ error: 'Failed to log action' }, { status: 500 });
  }
}

// GET /api/sessions/[sessionId]/actions - Get action history (for replay)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const actions = await prisma.sessionAction.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
  }
}
