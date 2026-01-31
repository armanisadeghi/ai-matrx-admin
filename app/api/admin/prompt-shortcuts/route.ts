// app/api/admin/prompt-shortcuts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  fetchPromptShortcuts,
  createPromptShortcut,
  fetchShortcutsWithRelations,
} from '@/features/prompt-builtins/services/admin-service';
import { CreatePromptShortcutInput } from '@/features/prompt-builtins/types/core';

/**
 * GET /api/admin/prompt-shortcuts
 * Fetch all prompt shortcuts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const promptBuiltinId = searchParams.get('prompt_builtin_id');
    const isActive = searchParams.get('is_active');
    const limit = searchParams.get('limit');
    const withRelations = searchParams.get('with_relations') === 'true';

    const filters: any = {};
    if (categoryId) filters.category_id = categoryId;
    if (promptBuiltinId) filters.prompt_builtin_id = promptBuiltinId;
    if (isActive !== null) filters.is_active = isActive === 'true';
    if (limit) filters.limit = parseInt(limit, 10);

    let data;
    if (withRelations) {
      data = await fetchShortcutsWithRelations(filters);
    } else {
      data = await fetchPromptShortcuts(filters);
    }

    return NextResponse.json({
      shortcuts: data,
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
 * POST /api/admin/prompt-shortcuts
 * Create a new prompt shortcut
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
    if (!body.prompt_builtin_id || !body.category_id || !body.label) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt_builtin_id, category_id, label' },
        { status: 400 }
      );
    }

    // Validate scope_mappings against available_scopes if both provided
    if (body.scope_mappings && body.available_scopes) {
      const mappedKeys = Object.keys(body.scope_mappings).filter(key => body.scope_mappings[key]);
      const invalidKeys = mappedKeys.filter(key => !body.available_scopes.includes(key));
      
      if (invalidKeys.length > 0) {
        return NextResponse.json(
          { 
            error: `scope_mappings contains keys not in available_scopes: ${invalidKeys.join(', ')}. Available: ${body.available_scopes.join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    const input: CreatePromptShortcutInput = {
      id: body.id,
      prompt_builtin_id: body.prompt_builtin_id,
      category_id: body.category_id,
      label: body.label,
      description: body.description,
      icon_name: body.icon_name,
      keyboard_shortcut: body.keyboard_shortcut,
      sort_order: body.sort_order,
      scope_mappings: body.scope_mappings,
      available_scopes: body.available_scopes,
      is_active: body.is_active,
    };

    const data = await createPromptShortcut(input);

    return NextResponse.json(
      {
        message: 'Prompt shortcut created successfully',
        shortcut: data,
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

