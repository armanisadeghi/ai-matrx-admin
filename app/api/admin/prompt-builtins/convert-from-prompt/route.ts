import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/prompt-builtins/convert-from-prompt
 * 
 * Converts a user's prompt to a builtin or updates an existing builtin
 * - If builtin_id is provided: updates the existing builtin with prompt data
 * - If builtin_id is omitted: creates a new builtin
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
    const { prompt_id, shortcut_id, builtin_id } = body;

    if (!prompt_id) {
      return NextResponse.json(
        { error: 'prompt_id is required' },
        { status: 400 }
      );
    }

    let finalBuiltinId: string;
    let isUpdate = false;

    if (builtin_id) {
      // UPDATE EXISTING BUILTIN
      isUpdate = true;

      // First, get the prompt data
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', prompt_id)
        .single();

      if (promptError || !prompt) {
        return NextResponse.json(
          { error: 'Failed to fetch prompt data' },
          { status: 500 }
        );
      }

      // Update the builtin with prompt data
      const { error: updateError } = await supabase
        .from('prompt_builtins')
        .update({
          name: prompt.name,
          description: prompt.description,
          messages: prompt.messages,
          variable_defaults: prompt.variable_defaults,
          tools: prompt.tools,
          settings: prompt.settings,
          source_prompt_id: prompt_id,
          source_prompt_snapshot_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', builtin_id);

      if (updateError) {
        console.error('Error updating builtin:', updateError);
        return NextResponse.json(
          { 
            error: 'Failed to update builtin',
            details: updateError.message,
            code: updateError.code
          },
          { status: 500 }
        );
      }

      finalBuiltinId = builtin_id;
    } else {
      // CREATE NEW BUILTIN
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

      finalBuiltinId = builtinId;
    }

    // If shortcut_id provided, link the builtin to the shortcut
    if (shortcut_id) {
      const { error: linkError } = await supabase
        .from('prompt_shortcuts')
        .update({ 
          prompt_builtin_id: finalBuiltinId,
          updated_at: new Date().toISOString()
        })
        .eq('id', shortcut_id);

      if (linkError) {
        console.error('Error linking builtin to shortcut:', linkError);
        // Don't fail the whole operation - builtin was created/updated successfully
        return NextResponse.json({
          builtin_id: finalBuiltinId,
          is_update: isUpdate,
          linked: false,
          message: `Builtin ${isUpdate ? 'updated' : 'created'} but failed to link to shortcut`,
          error: linkError.message
        });
      }
    }

    return NextResponse.json({
      builtin_id: finalBuiltinId,
      is_update: isUpdate,
      linked: !!shortcut_id,
      message: isUpdate
        ? shortcut_id 
          ? 'Builtin updated and linked to shortcut successfully'
          : 'Builtin updated successfully'
        : shortcut_id 
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

