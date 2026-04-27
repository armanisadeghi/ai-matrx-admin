/**
 * app/(a)/files/f/[fileId]/page.tsx
 *
 * File detail — preview + metadata. Renders PageShell with `initialFileId`
 * set, which makes the preview pane active immediately.
 *
 * Server-side: verify the file exists + is visible to the user. If not,
 * throw `notFound()` so the `not-found.tsx` boundary handles it.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

interface PageProps {
  params: Promise<{ fileId: string }>;
}

export default async function CloudFileDetailPage({ params }: PageProps) {
  const { fileId } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cld_files")
    .select("id, parent_folder_id")
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const sidebarMode = await readSidebarModeCookie();

  return (
    <PageShell
      section="all"
      initialFolderId={data.parent_folder_id}
      initialFileId={data.id}
      initialSidebarMode={sidebarMode}
    />
  );
}
