// app/api/admin/shortcut-categories/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getShortcutCategoryById,
  updateShortcutCategory,
  deleteShortcutCategory,
} from '@/features/prompt-builtins/services/admin-service';
import { UpdateShortcutCategoryInput } from '@/features/prompt-builtins/core';

/**
 * GET /api/admin/shortcut-categories/[id]
 * Get a single shortcut category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await getShortcutCategoryById(id);

    if (!data) {
      return NextResponse.json(
        { error: 'Shortcut category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/shortcut-categories/[id]
 * Update a shortcut category
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const input: UpdateShortcutCategoryInput = {
      id,
      placement_type: body.placement_type,
      parent_category_id: body.parent_category_id,
      label: body.label,
      description: body.description,
      icon_name: body.icon_name,
      color: body.color,
      sort_order: body.sort_order,
      is_active: body.is_active,
      metadata: body.metadata,
    };

    const data = await updateShortcutCategory(input);

    return NextResponse.json({
      message: 'Shortcut category updated successfully',
      category: data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/shortcut-categories/[id]
 * Delete a shortcut category (hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteShortcutCategory(id);

    return NextResponse.json({
      message: 'Shortcut category deleted successfully',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

