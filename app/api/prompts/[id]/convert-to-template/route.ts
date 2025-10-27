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

        // Check if user is a system admin
        const { data: adminCheck } = await supabase
            .from("admins")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!adminCheck) {
            return NextResponse.json(
                { error: "Forbidden: Admin access required" },
                { status: 403 }
            );
        }

        // Fetch the original prompt
        const { data: originalPrompt, error: fetchError } = await supabase
            .from("prompts")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !originalPrompt) {
            console.error("Error fetching prompt:", fetchError);
            return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
        }

        // Check if a template with this name already exists
        const { data: existingTemplate } = await supabase
            .from("prompt_templates")
            .select("id")
            .eq("name", originalPrompt.name)
            .single();

        let templateName = originalPrompt.name;
        if (existingTemplate) {
            // Append timestamp to make it unique
            templateName = `${originalPrompt.name} (Template ${new Date().toISOString().split('T')[0]})`;
        }

        // Create a new template from the prompt
        const { data: newTemplate, error: insertError } = await supabase
            .from("prompt_templates")
            .insert({
                name: templateName,
                description: originalPrompt.description || `Template created from prompt: ${originalPrompt.name}`,
                messages: originalPrompt.messages,
                variable_defaults: originalPrompt.variable_defaults,
                tools: originalPrompt.tools,
                settings: originalPrompt.settings,
                category: "custom", // Default category
                tags: ["user-created"],
                is_public: false, // Admin can make it public later
                use_count: 0,
                created_by: user.id,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating template:", insertError);
            return NextResponse.json(
                { error: "Failed to create template from prompt" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            template: newTemplate,
            message: `Successfully converted "${originalPrompt.name}" to template`,
        });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

