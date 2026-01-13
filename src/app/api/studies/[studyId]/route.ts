import { NextRequest, NextResponse } from 'next/server';
import { demoStudies, DEMO_MODE } from '../route';

interface RouteParams {
  params: Promise<{ studyId: string }>;
}

// GET /api/studies/[studyId] - Get study details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studyId } = await params;

    if (DEMO_MODE) {
      const study = demoStudies.get(studyId);
      if (!study) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }
      return NextResponse.json({
        ...study,
        _count: { sessions: study._count.sessions },
      });
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

    const study = await prisma.study.findFirst({
      where: {
        id: studyId,
        ownerId: userId,
      },
      include: {
        cards: { orderBy: { sortOrder: 'asc' } },
        categories: { orderBy: { sortOrder: 'asc' } },
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    return NextResponse.json(study);
  } catch (error) {
    console.error('Error fetching study:', error);
    return NextResponse.json({ error: 'Failed to fetch study' }, { status: 500 });
  }
}

// PATCH /api/studies/[studyId] - Update study
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { studyId } = await params;
    const body = await request.json();

    if (DEMO_MODE) {
      const study = demoStudies.get(studyId);
      if (!study) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }

      const { name, description, status, settings } = body;

      if (name) study.name = name.trim();
      if (description !== undefined) study.description = description?.trim() || null;
      if (status) study.status = status;
      if (settings) {
        if (settings.allowUndo !== undefined) study.allowUndo = settings.allowUndo;
        if (settings.showProgress !== undefined) study.showProgress = settings.showProgress;
        if (settings.requireAllCardsSorted !== undefined) study.requireAllCardsSorted = settings.requireAllCardsSorted;
        if (settings.randomizeCards !== undefined) study.randomizeCards = settings.randomizeCards;
        if (settings.timeLimitMinutes !== undefined) study.timeLimitMinutes = settings.timeLimitMinutes;
        if (settings.instructions !== undefined) study.instructions = settings.instructions?.trim() || null;
        if (settings.thankYouMessage !== undefined) study.thankYouMessage = settings.thankYouMessage?.trim() || null;
      }
      study.updatedAt = new Date();

      demoStudies.set(studyId, study);
      return NextResponse.json(study);
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

    const existing = await prisma.study.findFirst({
      where: { id: studyId, ownerId: userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const { name, description, status, settings } = body;

    const study = await prisma.study.update({
      where: { id: studyId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(settings && {
          allowUndo: settings.allowUndo,
          showProgress: settings.showProgress,
          requireAllCardsSorted: settings.requireAllCardsSorted,
          randomizeCards: settings.randomizeCards,
          timeLimitMinutes: settings.timeLimitMinutes,
          instructions: settings.instructions?.trim() || null,
          thankYouMessage: settings.thankYouMessage?.trim() || null,
        }),
      },
      include: {
        cards: true,
        categories: true,
      },
    });

    return NextResponse.json(study);
  } catch (error) {
    console.error('Error updating study:', error);
    return NextResponse.json({ error: 'Failed to update study' }, { status: 500 });
  }
}

// DELETE /api/studies/[studyId] - Delete study
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { studyId } = await params;

    if (DEMO_MODE) {
      if (!demoStudies.has(studyId)) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }
      demoStudies.delete(studyId);
      return NextResponse.json({ success: true });
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

    const existing = await prisma.study.findFirst({
      where: { id: studyId, ownerId: userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    await prisma.study.delete({
      where: { id: studyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting study:', error);
    return NextResponse.json({ error: 'Failed to delete study' }, { status: 500 });
  }
}
