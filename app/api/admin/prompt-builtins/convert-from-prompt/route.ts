import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/prompt-builtins/convert-from-prompt
 * 
 * Converts a user's prompt to a builtin using the convert_prompt_to_builtin() function
 * Optionally links it to a shortcut if shortcut_id is provided
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt_id, shortcut_id } = body;

    if (!prompt_id) {
      return NextResponse.json(
        { error: 'prompt_id is required' },
        { status: 400 }
      );
    }

    // Call the DB function to convert prompt to builtin
    const { data: builtinId, error: convertError } = await supabase
      .rpc('convert_prompt_to_builtin', {
        p_prompt_id: prompt_id,
        p_created_by_user_id: user.id
      });

    if (convertError) {
      console.error('Error converting prompt to builtin:', convertError);
      return NextResponse.json(
        { 
          error: 'Failed to convert prompt to builtin',
          details: convertError.message,
          code: convertError.code
        },
        { status: 500 }
      );
    }

    if (!builtinId) {
      return NextResponse.json(
        { error: 'No builtin ID returned from conversion' },
        { status: 500 }
      );
    }

    // If shortcut_id provided, link the builtin to the shortcut
    if (shortcut_id) {
      const { error: linkError } = await supabase
        .from('prompt_shortcuts')
        .update({ 
          prompt_builtin_id: builtinId,
          updated_at: new Date().toISOString()
        })
        .eq('id', shortcut_id);

      if (linkError) {
        console.error('Error linking builtin to shortcut:', linkError);
        // Don't fail the whole operation - builtin was created successfully
        return NextResponse.json({
          builtin_id: builtinId,
          linked: false,
          message: 'Builtin created but failed to link to shortcut',
          error: linkError.message
        });
      }
    }

    return NextResponse.json({
      builtin_id: builtinId,
      linked: !!shortcut_id,
      message: shortcut_id 
        ? 'Prompt converted to builtin and linked to shortcut successfully'
        : 'Prompt converted to builtin successfully'
    });

  } catch (error: any) {
    console.error('Error in convert-from-prompt route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

