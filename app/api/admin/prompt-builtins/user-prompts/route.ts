import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/prompt-builtins/user-prompts
 * 
 * Fetches all prompts owned by the current user with their variables extracted
 */
export async function GET() {
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

    // Fetch user's prompts
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('id, name, description, variable_defaults, updated_at, created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user prompts:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch prompts',
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Extract variable names from each prompt
    const promptsWithVariables = prompts.map(prompt => {
      const variables = (prompt.variable_defaults || []).map((v: any) => v.name);
      return {
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        variables,
        updated_at: prompt.updated_at,
        created_at: prompt.created_at,
      };
    });

    return NextResponse.json({
      prompts: promptsWithVariables,
      total: promptsWithVariables.length,
    });

  } catch (error: any) {
    console.error('Error in user-prompts route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

