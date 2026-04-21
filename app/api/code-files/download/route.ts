// app/api/code-files/download/route.ts
//
// Server routes that read / delete object-store code content. All access is
// gated through the `code-files/<userId>/...` key prefix so the Supabase
// session user can only touch their own objects.

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/utils/supabase/server";
import {
  deleteCodeFileObject,
  downloadCodeFileObject,
  isAuthorizedForKey,
} from "@/lib/code-files/objectStore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const bucket = url.searchParams.get("bucket");
  if (!key || !bucket) {
    return NextResponse.json(
      { error: "key and bucket are required" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data: userRes, error: authError } = await supabase.auth.getUser();
  if (authError || !userRes?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAuthorizedForKey(key, userRes.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const content = await downloadCodeFileObject({ key, bucket });
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, max-age=0",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("[api/code-files/download] failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface DeleteBody {
  s3_key?: string;
  s3_bucket?: string;
}

export async function DELETE(req: Request) {
  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { s3_key, s3_bucket } = body;
  if (!s3_key || !s3_bucket) {
    return NextResponse.json(
      { error: "s3_key and s3_bucket are required" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data: userRes, error: authError } = await supabase.auth.getUser();
  if (authError || !userRes?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAuthorizedForKey(s3_key, userRes.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteCodeFileObject({ key: s3_key, bucket: s3_bucket });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    console.error("[api/code-files/download] DELETE failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
