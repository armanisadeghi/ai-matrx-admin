import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

        const { data, error } = await supabase
            .from("prompt_apps")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching prompt app:", error);
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Prompt app not found" }, { status: 404 });
            }
            return NextResponse.json({ error: "Failed to fetch prompt app" }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in GET handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
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

        const body = await request.json();

        const { data, error } = await supabase
            .from("prompt_apps")
            .update(body)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating prompt app:", error);
            return NextResponse.json({ error: "Failed to update prompt app" }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in PATCH handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
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

        // Delete the prompt app (only if it belongs to the user)
        const { error } = await supabase
            .from("prompt_apps")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting prompt app:", error);
            return NextResponse.json({ error: "Failed to delete prompt app" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in DELETE handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
