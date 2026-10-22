// Super-Admin-only CRUD on the admins table.
//
// Defense layers:
//   1. requireSuperAdmin() — TS-level check (clean error path, audit hook)
//   2. DB RPC's is_super_admin() check — load-bearing, survives code edits
//
// Both run on every request. The DB layer is what actually keeps a regular
// admin (with codebase access) from making changes.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin } from "@/utils/auth/adminUtils";
import type { Database, Json } from "@/types/database.types";
import { extractErrorMessage } from "@/utils/errors";
import { PG_CODES } from "@ai-matrx/kit/db-codes";

type AdminLevel = Database["public"]["Enums"]["admin_level"];

function errorResponse(error: unknown) {
  const message = extractErrorMessage(error, "Unknown error");
  const status = message.startsWith("Unauthorized") ? 401
    : message.startsWith("Forbidden") || message.startsWith("Cannot") ? 403
    : 400;
  return NextResponse.json({ error: message }, { status });
}

// GET /api/admin/admins — list all admins
export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return errorResponse(e);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.schema("iam").rpc("admin_list");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ admins: data ?? [] });
}

// POST /api/admin/admins — promote a user to admin
// Body: { userId: string, level?: AdminLevel, permissions?: object, metadata?: object }
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return errorResponse(e);
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    level?: AdminLevel;
    permissions?: Json;
    metadata?: Json;
  } | null;

  if (!body?.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.schema("iam").rpc("admin_promote", {
    target_user_id: body.userId,
    target_level: body.level ?? "developer",
    target_permissions: body.permissions ?? {},
    target_metadata: body.metadata ?? {},
  });

  if (error) {
    const status = error.code === PG_CODES.insufficientPrivilege ? 403 : error.code === PG_CODES.foreignKeyViolation ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ admin: data });
}
