import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();

        // Check if user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch the original prompt
        const { data: originalPrompt, error: fetchError } = await supabase
            .from("prompts")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !originalPrompt) {
            console.error("Error fetching prompt:", fetchError);
            return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
        }

        // Create a duplicate
        const { data: newPrompt, error: insertError } = await supabase
            .from("prompts")
            .insert({
                name: `${originalPrompt.name} (Copy)`,
                messages: originalPrompt.messages,
                variable_defaults: originalPrompt.variable_defaults,
                tools: originalPrompt.tools,
                authenticated_read: originalPrompt.authenticated_read,
                is_public: false, // Don't copy public status
                user_id: user.id,
                public_read: originalPrompt.public_read,
                settings: originalPrompt.settings,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error duplicating prompt:", insertError);
            return NextResponse.json({ error: "Failed to duplicate prompt" }, { status: 500 });
        }

        return NextResponse.json({ success: true, prompt: newPrompt });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

