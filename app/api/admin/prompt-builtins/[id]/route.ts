import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPromptBuiltinById } from '@/features/prompt-builtins/services/admin-service';

/**
 * GET /api/admin/prompt-builtins/[id]
 * Fetch a single prompt builtin by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Builtin ID is required' },
        { status: 400 }
      );
    }

    const builtin = await getPromptBuiltinById(id);

    if (!builtin) {
      return NextResponse.json(
        { error: 'Builtin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      builtin,
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
