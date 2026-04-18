import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Dev-only magic login for local AI agents.
 *
 * Usage:
 *   GET /api/dev-login?token=<DEV_LOGIN_TOKEN>&next=/tasks
 *
 * Behavior:
 *   - Hard-refuses unless NODE_ENV !== 'production' AND host is localhost/127.0.0.1.
 *   - Requires ?token= to match process.env.DEV_LOGIN_TOKEN.
 *   - If a valid session already exists, just 302s to `next` (no re-login).
 *   - Otherwise signs in with AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD and 302s to `next`.
 *   - `next` must be a relative path starting with "/". Defaults to "/dashboard".
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Disabled in production" },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const hostname = url.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1";
  if (!isLocal) {
    return NextResponse.json({ error: "Localhost only" }, { status: 403 });
  }

  const expectedToken = process.env.DEV_LOGIN_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "DEV_LOGIN_TOKEN is not set in .env.local" },
      { status: 500 },
    );
  }

  const token = url.searchParams.get("token");
  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const safeNext =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";
  const destination = new URL(safeNext, url.origin);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.redirect(destination);
  }

  const email = process.env.AI_ADMIN_USERNAME;
  const password = process.env.AI_ADMIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { error: "AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD not configured" },
      { status: 500 },
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.redirect(destination);
}
