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

        // Fetch the template
        const { data: template, error: fetchError } = await supabase
            .from("prompt_templates")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !template) {
            console.error("Error fetching template:", fetchError);
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Create a new prompt from the template
        const { data: newPrompt, error: insertError } = await supabase
            .from("prompts")
            .insert({
                name: `${template.name} (From Template)`,
                messages: template.messages,
                variable_defaults: template.variable_defaults,
                tools: template.tools,
                settings: template.settings,
                user_id: user.id,
                authenticated_read: true,
                is_public: false,
                public_read: false,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating prompt from template:", insertError);
            return NextResponse.json(
                { error: "Failed to create prompt from template" },
                { status: 500 }
            );
        }

        // Increment the use count for the template
        await supabase
            .from("prompt_templates")
            .update({ use_count: (template.use_count || 0) + 1 })
            .eq("id", id);

        return NextResponse.json({ success: true, prompt: newPrompt });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

