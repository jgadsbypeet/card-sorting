import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// POST /api/sessions/[sessionId]/categories - Create a category (open sorting)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Verify session exists and is in progress
    const session = await prisma.participantSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 403 }
      );
    }

    // Get current category count for sort order
    const categoryCount = await prisma.createdCategory.count({
      where: { sessionId },
    });

    const category = await prisma.createdCategory.create({
      data: {
        sessionId,
        name,
        sortOrder: categoryCount,
      },
    });

    // Log action
    await prisma.sessionAction.create({
      data: {
        sessionId,
        type: 'CREATE_CATEGORY',
        details: {
          categoryId: category.id,
          name,
        },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// GET /api/sessions/[sessionId]/categories - Get all categories for session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const categories = await prisma.createdCategory.findMany({
      where: { sessionId },
      include: {
        placements: {
          include: {
            card: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
