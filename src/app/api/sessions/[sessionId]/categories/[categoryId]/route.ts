import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string; categoryId: string }>;
}

// PUT /api/sessions/[sessionId]/categories/[categoryId] - Rename category
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId, categoryId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await prisma.createdCategory.update({
      where: { id: categoryId },
      data: { name },
    });

    // Log action
    await prisma.sessionAction.create({
      data: {
        sessionId,
        type: 'RENAME_CATEGORY',
        details: {
          categoryId,
          newName: name,
        },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[sessionId]/categories/[categoryId] - Delete category
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId, categoryId } = await params;

    // Move all cards in this category back to unsorted (delete placements)
    await prisma.cardPlacement.deleteMany({
      where: {
        sessionId,
        createdCategoryId: categoryId,
      },
    });

    // Delete the category
    await prisma.createdCategory.delete({
      where: { id: categoryId },
    });

    // Log action
    await prisma.sessionAction.create({
      data: {
        sessionId,
        type: 'DELETE_CATEGORY',
        details: {
          categoryId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
