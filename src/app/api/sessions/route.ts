import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/sessions - Create a new participant session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studyId, userAgent, screenWidth, screenHeight, accessibilityMode } = body;

    if (!studyId) {
      return NextResponse.json(
        { error: 'Study ID is required' },
        { status: 400 }
      );
    }

    // Verify study exists and is active
    const study = await prisma.study.findUnique({
      where: { id: studyId },
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

    // Generate display ID (P001, P002, etc.)
    const sessionCount = await prisma.participantSession.count({
      where: { studyId },
    });
    const displayId = `P${String(sessionCount + 1).padStart(3, '0')}`;

    // Create session
    const session = await prisma.participantSession.create({
      data: {
        studyId,
        displayId,
        userAgent: userAgent || null,
        screenWidth: screenWidth || null,
        screenHeight: screenHeight || null,
        accessibilityMode: accessibilityMode || null,
      },
    });

    // Log start action
    await prisma.sessionAction.create({
      data: {
        sessionId: session.id,
        type: 'START_SESSION',
        details: {
          userAgent,
          screenWidth,
          screenHeight,
          accessibilityMode,
        },
      },
    });

    return NextResponse.json({
      id: session.id,
      displayId: session.displayId,
      startedAt: session.startedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
