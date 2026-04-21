import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const CATEGORY_FIELDS = [
  "id",
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

function pickCategoryFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of CATEGORY_FIELDS) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const scopeId = searchParams.get("scopeId");
    const placementType = searchParams.get("placement_type");
    const isActive = searchParams.get("is_active");

    let query = supabase.from("shortcut_categories").select("*");

    if (scope === "global") {
      query = query
        .is("user_id", null)
        .is("organization_id", null)
        .is("project_id", null)
        .is("task_id", null);
    } else if (scope === "user") {
      query = query.eq("user_id", user.id);
    } else if (scope === "organization") {
      if (!scopeId) {
        return NextResponse.json(
          { error: "scopeId is required when scope=organization" },
          { status: 400 },
        );
      }
      query = query.eq("organization_id", scopeId);
    } else if (scope === "project") {
      if (!scopeId) {
        return NextResponse.json(
          { error: "scopeId is required when scope=project" },
          { status: 400 },
        );
      }
      query = query.eq("project_id", scopeId);
    } else if (scope === "task") {
      if (!scopeId) {
        return NextResponse.json(
          { error: "scopeId is required when scope=task" },
          { status: 400 },
        );
      }
      query = query.eq("task_id", scopeId);
    } else if (scope) {
      return NextResponse.json(
        { error: `Unknown scope: ${scope}` },
        { status: 400 },
      );
    }

    if (placementType) query = query.eq("placement_type", placementType);
    if (isActive !== null) query = query.eq("is_active", isActive === "true");

    query = query.order("sort_order", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching shortcut categories:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch shortcut categories",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("Error in GET /api/agent-shortcut-categories:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!body.label || !body.placement_type) {
      return NextResponse.json(
        { error: "Missing required fields: label, placement_type" },
        { status: 400 },
      );
    }

    const insertPayload = pickCategoryFields(body);

    const { data, error } = await supabase
      .from("shortcut_categories")
      .insert(insertPayload as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating shortcut category:", error);
      const status = error.code === "42501" || error.code === "PGRST301" ? 403 : 500;
      return NextResponse.json(
        {
          error: "Failed to create shortcut category",
          details: error.message,
        },
        { status },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/agent-shortcut-categories:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
