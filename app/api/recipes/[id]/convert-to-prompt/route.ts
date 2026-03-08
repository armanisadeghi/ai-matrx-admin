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
        const { compiledRecipeId, version, appletId } = body;

        let promptId: string;

        if (appletId) {
            // Combined path: convert recipe → prompt AND write promptId back to applet config atomically
            const { data, error } = await supabase.rpc('convert_recipe_and_bind_to_applet', {
                p_applet_config_id:   appletId,
                p_user_id:            user.id,
                p_compiled_recipe_id: compiledRecipeId || null,
                p_recipe_id:          compiledRecipeId ? null : id,
                p_version:            version || null,
            });

            if (error) {
                console.error("Error converting recipe and binding to applet:", error);
                return NextResponse.json(
                    { error: error.message || "Failed to convert recipe to prompt" },
                    { status: 500 }
                );
            }

            const result = data as { promptId: string; appletConfigId: string };
            promptId = result.promptId;
        } else {
            // Standalone path: convert only, no applet binding
            const { data, error } = await supabase.rpc('convert_compiled_recipe_to_prompt', {
                p_compiled_recipe_id: compiledRecipeId || null,
                p_recipe_id:          compiledRecipeId ? null : id,
                p_version:            version || null,
                p_user_id:            user.id,
            });

            if (error) {
                console.error("Error converting recipe to prompt:", error);
                return NextResponse.json(
                    { error: error.message || "Failed to convert recipe to prompt" },
                    { status: 500 }
                );
            }

            promptId = data as string;
        }

        return NextResponse.json({ 
            success: true,
            promptId,
        });
    } catch (error) {
        console.error("Error in convert-to-prompt route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

