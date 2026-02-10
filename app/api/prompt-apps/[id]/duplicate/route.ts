import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch the original prompt app
        const { data: original, error: fetchError } = await supabase
            .from("prompt_apps")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !original) {
            console.error("Error fetching prompt app:", fetchError);
            return NextResponse.json(
                { error: "Prompt app not found or access denied" },
                { status: 404 }
            );
        }

        // Generate a unique slug for the copy
        const baseSlug = `${original.slug}-copy`;
        let slug = baseSlug;
        let attempt = 0;

        // Check for slug conflicts and increment
        while (true) {
            const { data: existing } = await supabase
                .from("prompt_apps")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();

            if (!existing) break;

            attempt++;
            slug = `${baseSlug}-${attempt}`;
        }

        // Create a duplicate owned by the current user
        const { data: newApp, error: insertError } = await supabase
            .from("prompt_apps")
            .insert({
                user_id: user.id,
                prompt_id: original.prompt_id,
                slug,
                name: `${original.name} (Copy)`,
                tagline: original.tagline,
                description: original.description,
                category: original.category,
                tags: original.tags,
                component_code: original.component_code,
                component_language: original.component_language,
                variable_schema: original.variable_schema,
                allowed_imports: original.allowed_imports,
                layout_config: original.layout_config,
                styling_config: original.styling_config,
                status: "draft",
                rate_limit_per_ip: original.rate_limit_per_ip,
                rate_limit_window_hours: original.rate_limit_window_hours,
                rate_limit_authenticated: original.rate_limit_authenticated,
                favicon_url: original.favicon_url,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error duplicating prompt app:", insertError);
            return NextResponse.json(
                { error: "Failed to duplicate prompt app" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, app: newApp });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
