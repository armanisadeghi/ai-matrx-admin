// record-view: file
// The PDF workspace for one file. The file must be readable by this person; when it is not, the access gate
// names why (denied, deleted, missing) instead of a bare 404 — the same check /files/f/[fileId] makes.
import type { Metadata } from "next";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { filesDb } from "@/features/files/filesDb";
import { PdfWorkspaceRoute } from "@/features/pdf/workspace/PdfWorkspaceRoute";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "PDF workspace" };

export default async function Page({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();
  const { data } = await filesDb(supabase).from("files").select("id, organization_id").eq("id", fileId).is("deleted_at", null).maybeSingle();
  if (!data) {
    return (
      <div className="h-full overflow-hidden">
        <AccessGate token="file" id={fileId} fallbackHref="/pdf" fallbackLabel="PDF" />
      </div>
    );
  }
  return <PdfWorkspaceRoute fileId={fileId} organizationId={data.organization_id} />;
}
