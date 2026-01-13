import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// POST /api/participate/[slug]/sessions - Start a new participant session
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Find the study
    const study = await prisma.study.findUnique({
      where: { slug },
      include: {
        _count: { select: { sessions: true } },
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    if (study.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'This study is not currently accepting responses' 
      }, { status: 403 });
    }

    // Generate display ID (P001, P002, etc.)
    const displayId = `P${(study._count.sessions + 1).toString().padStart(3, '0')}`;

    // Create session
    const session = await prisma.participantSession.create({
      data: {
        studyId: study.id,
        displayId,
        userAgent: body.userAgent || null,
        screenWidth: body.screenWidth || null,
        screenHeight: body.screenHeight || null,
        accessibilityMode: body.accessibilityMode || null,
      },
    });

    // Log session start
    await prisma.sessionAction.create({
      data: {
        sessionId: session.id,
        type: 'START_SESSION',
        details: {
          userAgent: body.userAgent,
          screenSize: body.screenWidth && body.screenHeight 
            ? `${body.screenWidth}x${body.screenHeight}` 
            : null,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      displayId: session.displayId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
