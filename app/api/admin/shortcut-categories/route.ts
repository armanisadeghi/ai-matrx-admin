// app/api/admin/shortcut-categories/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  fetchShortcutCategories,
  createShortcutCategory,
  fetchCategoriesWithShortcutCounts,
} from '@/features/prompt-builtins/services/admin-service';
import { CreateShortcutCategoryInput } from '@/features/prompt-builtins/types/core';

/**
 * GET /api/admin/shortcut-categories
 * Fetch all shortcut categories with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const placementType = searchParams.get('placement_type');
    const parentCategoryId = searchParams.get('parent_category_id');
    const isActive = searchParams.get('is_active');
    const withCounts = searchParams.get('with_counts') === 'true';

    const filters: any = {};
    if (placementType) filters.placement_type = placementType;
    if (parentCategoryId !== null) {
      filters.parent_category_id = parentCategoryId === 'null' ? null : parentCategoryId;
    }
    if (isActive !== null) filters.is_active = isActive === 'true';

    let data;
    if (withCounts) {
      data = await fetchCategoriesWithShortcutCounts(placementType || undefined);
    } else {
      data = await fetchShortcutCategories(filters);
    }

    return NextResponse.json({
      categories: data,
      count: data.length,
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
 * POST /api/admin/shortcut-categories
 * Create a new shortcut category
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.placement_type || !body.label) {
      return NextResponse.json(
        { error: 'Missing required fields: placement_type, label' },
        { status: 400 }
      );
    }

    const input: CreateShortcutCategoryInput = {
      id: body.id,
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

    const data = await createShortcutCategory(input);

    return NextResponse.json(
      {
        message: 'Shortcut category created successfully',
        category: data,
      },
      { status: 201 }
    );
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

