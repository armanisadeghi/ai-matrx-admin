// app/api/admin/prompt-builtins/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getPromptBuiltinById,
  updatePromptBuiltin,
  deletePromptBuiltin,
} from '@/features/prompt-builtins/services/admin-service';
import { UpdatePromptBuiltinInput } from '@/features/prompt-builtins/types';

/**
 * GET /api/admin/prompt-builtins/[id]
 * Get a single prompt builtin by ID
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
    const data = await getPromptBuiltinById(id);

    if (!data) {
      return NextResponse.json(
        { error: 'Prompt builtin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ builtin: data });
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
 * PUT /api/admin/prompt-builtins/[id]
 * Update a prompt builtin
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

    // Validate messages if provided
    if (body.messages !== undefined) {
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return NextResponse.json(
          { error: 'Messages must be a non-empty array' },
          { status: 400 }
        );
      }
    }

    const input: UpdatePromptBuiltinInput = {
      id,
      name: body.name,
      description: body.description,
      messages: body.messages,
      variable_defaults: body.variable_defaults,
      tools: body.tools,
      settings: body.settings,
      is_active: body.is_active,
    };

    const data = await updatePromptBuiltin(input);

    return NextResponse.json({
      message: 'Prompt builtin updated successfully',
      builtin: data,
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
 * DELETE /api/admin/prompt-builtins/[id]
 * Delete a prompt builtin (hard delete)
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
    await deletePromptBuiltin(id);

    return NextResponse.json({
      message: 'Prompt builtin deleted successfully',
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

