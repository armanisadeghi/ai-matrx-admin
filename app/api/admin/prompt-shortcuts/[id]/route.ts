// app/api/admin/prompt-shortcuts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getPromptShortcutById,
  updatePromptShortcut,
  deletePromptShortcut,
} from '@/features/prompt-builtins/services/admin-service';
import { UpdatePromptShortcutInput } from '@/features/prompt-builtins/types/core';

/**
 * GET /api/admin/prompt-shortcuts/[id]
 * Get a single prompt shortcut by ID
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
    const data = await getPromptShortcutById(id);

    if (!data) {
      return NextResponse.json(
        { error: 'Prompt shortcut not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ shortcut: data });
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
 * PUT /api/admin/prompt-shortcuts/[id]
 * Update a prompt shortcut
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

    const input: UpdatePromptShortcutInput = {
      id,
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

    const data = await updatePromptShortcut(input);

    return NextResponse.json({
      message: 'Prompt shortcut updated successfully',
      shortcut: data,
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
 * DELETE /api/admin/prompt-shortcuts/[id]
 * Delete a prompt shortcut (hard delete)
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
    await deletePromptShortcut(id);

    return NextResponse.json({
      message: 'Prompt shortcut deleted successfully',
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

