import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const CATEGORY_UPDATE_FIELDS = [
  "label",
  "description",
  "icon_name",
  "color",
  "placement_type",
  "parent_category_id",
  "sort_order",
  "is_active",
  "metadata",
  "enabled_contexts",
  "user_id",
  "organization_id",
  "project_id",
  "task_id",
] as const;

function pickUpdateFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of CATEGORY_UPDATE_FIELDS) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
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
      .from("shortcut_categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching shortcut category:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch shortcut category",
          details: error.message,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Shortcut category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET /api/agent-shortcut-categories/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
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
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    const updatePayload = pickUpdateFields(body);

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("shortcut_categories")
      .update(updatePayload as never)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating shortcut category:", error);
      const status = error.code === "42501" || error.code === "PGRST301" ? 403 : 500;
      return NextResponse.json(
        {
          error: "Failed to update shortcut category",
          details: error.message,
        },
        { status },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Shortcut category not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in PATCH /api/agent-shortcut-categories/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
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

    const { error, count } = await supabase
      .from("shortcut_categories")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting shortcut category:", error);
      const status = error.code === "42501" || error.code === "PGRST301" ? 403 : 500;
      return NextResponse.json(
        {
          error: "Failed to delete shortcut category",
          details: error.message,
        },
        { status },
      );
    }

    if (!count) {
      return NextResponse.json(
        { error: "Shortcut category not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error("Error in DELETE /api/agent-shortcut-categories/[id]:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
