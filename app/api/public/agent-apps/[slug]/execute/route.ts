import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { v4 as uuidv4 } from "uuid";
import {
  checkGuestLimit,
  recordGuestExecution,
} from "@/lib/services/guest-limit-service";
import {
  isValidFingerprint,
  isTempFingerprint,
} from "@/lib/services/fingerprint-service";
import { getPublicAppsRatelimiter } from "@/lib/rate-limit/client";
import { ipRateLimit } from "@/lib/rate-limit/helpers";
import { ENDPOINTS, BACKEND_URLS } from "@/lib/api/endpoints";
import crypto from "crypto";

function createBackupIdentifier(ip: string, userAgent: string): string {
  const combined = `${ip}:${userAgent}`;
  return crypto
    .createHash("sha256")
    .update(combined)
    .digest("hex")
    .substring(0, 32);
}

type AppLookup = {
  id: string;
  slug: string;
  name: string;
  status: string;
  is_public: boolean;
  agent_id: string;
  agent_version_id: string | null;
  use_latest: boolean;
  variable_schema: unknown;
};

// agent_apps and aga_executions are added by Phase-8 migrations and
// are not yet present in the generated database types. Until types are
// regenerated, cast the admin client to `any` at the call site.
function adminAny(): any {
  return createAdminClient() as unknown as any;
}

async function resolveApp(slug: string): Promise<AppLookup | null> {
  const admin = adminAny();
  const { data } = await admin
    .from("agent_apps")
    .select(
      "id, slug, name, status, is_public, agent_id, agent_version_id, use_latest, variable_schema",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("is_public", true)
    .maybeSingle();
  return (data as AppLookup | null) ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const {
      variables = {},
      variables_provided = {},
      user_input,
      fingerprint,
      conversation_id,
      metadata = {},
    } = body ?? {};

    const ip_address =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const user_agent = request.headers.get("user-agent") || "unknown";
    const referer = request.headers.get("referer") || undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isPublicAccess = !user?.id;

    if (isPublicAccess) {
      const rateLimited = await ipRateLimit(
        request,
        getPublicAppsRatelimiter(),
      );
      if (rateLimited) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: "ip_rate_limit_exceeded",
              message:
                "Too many requests from this network. Please try again later or sign up for unlimited access.",
            },
          },
          { status: 429 },
        );
      }
    }

    if (isPublicAccess && !fingerprint) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "invalid_request",
            message: "Fingerprint is required for guest access",
          },
        },
        { status: 400 },
      );
    }

    if (isPublicAccess && !isValidFingerprint(fingerprint)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "invalid_fingerprint",
            message: "Invalid guest identification. Please refresh the page.",
          },
        },
        { status: 400 },
      );
    }

    const app = await resolveApp(slug);
    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: { type: "not_found", message: "Agent app not found" },
        },
        { status: 404 },
      );
    }

    const backupIdentifier = createBackupIdentifier(ip_address, user_agent);
    let primaryIdentifier = fingerprint || "";
    let identifierType: "fingerprint" | "ip_hash" | "temp" = "fingerprint";

    if (isPublicAccess && isTempFingerprint(fingerprint)) {
      primaryIdentifier = backupIdentifier;
      identifierType = "ip_hash";
    }

    let guestLimitResult = null;
    if (isPublicAccess) {
      try {
        guestLimitResult = await checkGuestLimit(supabase, primaryIdentifier);

        if (!guestLimitResult.allowed || guestLimitResult.is_blocked) {
          const taskId = uuidv4();

          const admin = adminAny();
          admin
            .from("aga_executions")
            .insert({
              app_id: app.id,
              user_id: null,
              fingerprint: primaryIdentifier,
              ip_address,
              user_agent,
              task_id: taskId,
              variables_provided,
              variables_used: variables,
              success: false,
              error_type: "rate_limit_exceeded",
              error_message:
                "Guest execution limit reached. Please sign up to continue.",
              referer,
              metadata: {
                ...metadata,
                guest_limit_hit: true,
                total_used: guestLimitResult.total_used,
                identifier_type: identifierType,
                backup_identifier: backupIdentifier,
              },
            })
            .then(() => {});

          return NextResponse.json(
            {
              success: false,
              guest_limit: guestLimitResult,
              error: {
                type: "guest_limit_exceeded",
                message:
                  "You have reached the maximum number of free executions. Please sign up to continue.",
                details: {
                  remaining: guestLimitResult.remaining,
                  total_used: guestLimitResult.total_used,
                  is_blocked: guestLimitResult.is_blocked,
                },
              },
            },
            { status: 429 },
          );
        }
      } catch (err) {
        console.error("Guest limit check failed:", err);
        return NextResponse.json(
          {
            success: false,
            error: {
              type: "service_error",
              message:
                "Unable to verify guest access. Please try again or sign up.",
            },
          },
          { status: 503 },
        );
      }
    }

    const taskId = uuidv4();
    const newConversationId = conversation_id || uuidv4();

    const admin = adminAny();
    const { error: insertError } = await admin.from("aga_executions").insert({
      app_id: app.id,
      user_id: user?.id || null,
      fingerprint: isPublicAccess ? primaryIdentifier : null,
      ip_address,
      user_agent,
      task_id: taskId,
      variables_provided,
      variables_used: variables,
      success: true,
      referer,
      metadata: {
        ...metadata,
        is_public_access: isPublicAccess,
        identifier_type: isPublicAccess ? identifierType : undefined,
        backup_identifier: isPublicAccess ? backupIdentifier : undefined,
        conversation_id: newConversationId,
      },
    });

    if (insertError) {
      const msg = insertError.message ?? "";
      if (msg.includes("aga_rate_limit_exceeded")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: "rate_limit_exceeded",
              message:
                "This app has reached its rate limit. Please try again later.",
            },
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "execution_error",
            message: "Failed to record execution.",
          },
        },
        { status: 500 },
      );
    }

    if (isPublicAccess) {
      recordGuestExecution(supabase, {
        fingerprint: primaryIdentifier,
        // The guest-limit service currently accepts a fixed union; "other"
        // is used for agent_app until the enum is widened in a later phase.
        resourceType: "other",
        resourceId: app.id,
        resourceName: `agent_app:${slug}`,
        taskId,
        ipAddress: ip_address,
        userAgent: user_agent,
        referer,
      }).catch((err) => {
        console.error("Failed to record guest execution:", err);
      });
    }

    const BACKEND_URL = BACKEND_URLS.production ?? BACKEND_URLS.localhost!;

    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const authHeader = request.headers.get("authorization");
    if (authHeader) forwardHeaders["Authorization"] = authHeader;

    const executeUrl = conversation_id
      ? `${BACKEND_URL}${ENDPOINTS.ai.conversationContinue(conversation_id)}`
      : `${BACKEND_URL}${ENDPOINTS.ai.agentStart(app.agent_id)}`;

    const upstreamBody = conversation_id
      ? { user_input: user_input ?? "", stream: true, debug: false }
      : {
          variables,
          user_input,
          stream: true,
          debug: false,
          conversation_id: newConversationId,
        };

    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort());

    let upstream: Response;
    try {
      upstream = await fetch(executeUrl, {
        method: "POST",
        headers: forwardHeaders,
        body: JSON.stringify(upstreamBody),
        signal: abortController.signal,
      });
    } catch (err) {
      admin
        .from("aga_executions")
        .update({
          success: false,
          error_type: "execution_error",
          error_message:
            err instanceof Error ? err.message : "Backend unreachable",
        })
        .eq("task_id", taskId)
        .then(() => {});
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "execution_error",
            message: "Unable to reach the agent backend.",
          },
        },
        { status: 502 },
      );
    }

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      admin
        .from("aga_executions")
        .update({
          success: false,
          error_type: "execution_error",
          error_message: `Upstream HTTP ${upstream.status}: ${text.slice(0, 512)}`,
        })
        .eq("task_id", taskId)
        .then(() => {});

      return new NextResponse(text || "Upstream error", {
        status: upstream.status || 502,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/x-ndjson",
    );
    const upstreamConvId =
      upstream.headers.get("X-Conversation-ID") ?? newConversationId;
    responseHeaders.set("X-Conversation-ID", upstreamConvId);
    responseHeaders.set("X-Task-ID", taskId);
    responseHeaders.set("Cache-Control", "no-cache, no-transform");

    return new NextResponse(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Agent-app execute error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: "execution_error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  await params;
  const admin = adminAny();

  try {
    const body = await request.json();
    const { task_id, error_type, error_message, metadata } = body;

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: "task_id is required" },
        { status: 400 },
      );
    }

    const { error: updateError } = await admin
      .from("aga_executions")
      .update({
        success: false,
        error_type: error_type || "stream_error",
        error_message:
          error_message || "Stream error occurred after execution started",
        metadata: metadata || {},
      })
      .eq("task_id", task_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to update record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = (await createClient()) as unknown as any;

  const { data: app, error } = await supabase
    .rpc("get_aga_public_data", { p_slug: slug, p_app_id: null })
    .single();

  if (error || !app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}
