import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse request body to get optional parameters
        const body = await request.json().catch(() => ({}));
        const { compiledRecipeId, version } = body;

        // Call the SQL function to convert compiled recipe to prompt
        const { data, error } = await supabase.rpc('convert_compiled_recipe_to_prompt', {
            p_compiled_recipe_id: compiledRecipeId || null,
            p_recipe_id: compiledRecipeId ? null : id,
            p_version: version || null,
            p_user_id: user.id
        });

        if (error) {
            console.error("Error converting recipe to prompt:", error);
            return NextResponse.json(
                { error: error.message || "Failed to convert recipe to prompt" },
                { status: 500 }
            );
        }

        // data should contain the new prompt ID
        return NextResponse.json({ 
            success: true,
            promptId: data
        });
    } catch (error) {
        console.error("Error in convert-to-prompt route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

