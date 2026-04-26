import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { checkIsUserAdmin } from "@/utils/supabase/userSessionData";
import { NextRequest, NextResponse } from "next/server";
import type { CreateAgentAppInput } from "@/features/agent-apps/types";

/**
 * POST /api/agent-apps
 *
 * Creates a new agent app for the authenticated user. Mirrors the legacy
 * `prompt_apps` creation flow but against the `agent_apps` table.
 *
 * When `scope: "global"` is passed, the caller must be an admin; the app is
 * created with all scope columns null so it's globally visible.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as any;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CreateAgentAppInput>;

    const {
      agent_id,
      agent_version_id,
      use_latest,
      slug,
      name,
      tagline,
      description,
      category,
      tags,
      component_code,
      component_language,
      variable_schema,
      allowed_imports,
      layout_config,
      styling_config,
      scope,
    } = body;

    const isGlobal = scope === "global";
    if (isGlobal) {
      const isAdmin = await checkIsUserAdmin(supabase, user.id);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: admin privileges required for global apps" },
          { status: 403 },
        );
      }
    }

    if (!agent_id || !slug || !name || !component_code) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: agent_id, slug, name, component_code",
        },
        { status: 400 },
      );
    }

    // Basic safety check — slugs are also validated client-side via the
    // `validate_slugs` RPC and enforced at the DB level via unique + format
    // constraints. This regex just rejects obvious garbage before we round-
    // trip to Postgres.
    const normalizedSlug = slug.trim().toLowerCase();
    if (
      normalizedSlug.length < 1 ||
      normalizedSlug.length > 50 ||
      !/^[a-z0-9][a-z0-9-]*$/.test(normalizedSlug) ||
      normalizedSlug.endsWith("-")
    ) {
      return NextResponse.json(
        { error: "Invalid slug format" },
        { status: 400 },
      );
    }

    // Surface the common "slug already taken" error with a clear message
    // instead of a raw Postgres unique-violation payload.
    const { data: existing, error: existingError } = await supabase
      .from("aga_apps")
      .select("id")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      return NextResponse.json(
        {
          error: "Failed to validate slug",
          details: existingError.message,
        },
        { status: 500 },
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "That slug is already taken" },
        { status: 409 },
      );
    }

    const insertPayload = {
      agent_id,
      agent_version_id: agent_version_id ?? null,
      use_latest: use_latest ?? true,
      user_id: isGlobal ? null : user.id,
      organization_id: null,
      project_id: null,
      task_id: null,
      slug: normalizedSlug,
      name: name.trim(),
      tagline: tagline ?? null,
      description: description ?? null,
      category: category ?? null,
      tags: tags ?? [],
      component_code,
      component_language: component_language ?? "tsx",
      variable_schema: (variable_schema ?? []) as unknown,
      allowed_imports: (allowed_imports ?? []) as unknown,
      layout_config: (layout_config ?? {}) as unknown,
      styling_config: (styling_config ?? {}) as unknown,
      status: "draft",
    };

    // Global apps bypass RLS via the admin client because user_id = null
    // would fail a typical owner-check INSERT policy.
    const writer = isGlobal ? createAdminClient() : supabase;
    const { data, error } = await writer
      .from("aga_apps")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("POST /api/agent-apps insert error:", error);
      return NextResponse.json(
        {
          error: "Failed to create agent app",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    // Fire-and-forget favicon generation — matches the legacy prompt-apps
    // behavior. We deliberately don't await it or propagate failures.
    try {
      const origin = request.nextUrl.origin;
      void fetch(`${origin}/api/agent-apps/generate-favicon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward the session cookies so the favicon endpoint (if it auth-
          // checks) sees the same user.
          cookie: request.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ appId: data.id, name: data.name }),
      }).catch(() => undefined);
    } catch {
      // non-fatal
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/agent-apps unexpected:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 },
    );
  }
}
