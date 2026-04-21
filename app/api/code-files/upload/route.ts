// app/api/code-files/upload/route.ts
//
// Server route that uploads code file content to the object store. Uses the
// Supabase-Storage backing (see lib/code-files/objectStore.ts); swap that
// module for an AWS S3 client when credentials are provisioned.

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/utils/supabase/server";
import { uploadCodeFileObject } from "@/lib/code-files/objectStore";

export const runtime = "nodejs";

interface UploadBody {
  fileId?: string;
  content?: string;
  contentType?: string;
}

export async function POST(req: Request) {
  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { fileId, content, contentType } = body;
  if (!fileId || typeof content !== "string") {
    return NextResponse.json(
      { error: "fileId and content are required" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data: userRes, error: authError } = await supabase.auth.getUser();
  if (authError || !userRes?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  // Confirm the caller owns this code_file row before writing to its key.
  const { data: row, error: rowError } = await supabase
    .from("code_files")
    .select("id,user_id")
    .eq("id", fileId)
    .eq("is_deleted", false)
    .single();
  if (rowError || !row) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (row.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await uploadCodeFileObject({
      userId,
      fileId,
      content,
      contentType: contentType ?? "text/plain; charset=utf-8",
    });
    return NextResponse.json({
      s3_key: result.key,
      s3_bucket: result.bucket,
      size: result.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[api/code-files/upload] failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
