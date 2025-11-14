// app/api/admin/prompt-builtins/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  fetchPromptBuiltins,
  createPromptBuiltin,
} from '@/features/prompt-builtins/services/admin-service';
import { CreatePromptBuiltinInput } from '@/features/prompt-builtins/types';

/**
 * GET /api/admin/prompt-builtins
 * Fetch all prompt builtins with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    const filters: any = {};
    if (isActive !== null) filters.is_active = isActive === 'true';
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit, 10);

    const data = await fetchPromptBuiltins(filters);

    return NextResponse.json({
      builtins: data,
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
 * POST /api/admin/prompt-builtins
 * Create a new prompt builtin
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
    if (!body.name || !body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, messages (non-empty array)' },
        { status: 400 }
      );
    }

    const input: CreatePromptBuiltinInput = {
      id: body.id,
      name: body.name,
      description: body.description,
      messages: body.messages,
      variable_defaults: body.variable_defaults,
      tools: body.tools,
      settings: body.settings,
      is_active: body.is_active,
    };

    const data = await createPromptBuiltin(input);

    return NextResponse.json(
      {
        message: 'Prompt builtin created successfully',
        builtin: data,
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

