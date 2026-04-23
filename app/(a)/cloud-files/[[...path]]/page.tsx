/**
 * app/(a)/cloud-files/[[...path]]/page.tsx
 *
 * Folder deep-link. URL `/cloud-files/reports/2026/q1` resolves to the folder
 * with folder_path = "reports/2026/q1" server-side, then hands off to the
 * client PageShell with `initialFolderId` so the view lands on the correct
 * folder without a client-side round-trip.
 *
 * Falls back to the root view if the path can't be resolved (rather than
 * 404ing — keeps the experience graceful for moved/renamed folders).
 */

import { createClient } from "@/utils/supabase/server";
import { PageShell } from "@/features/files";

interface PageProps {
  params: Promise<{ path?: string[] }>;
}

export default async function CloudFilesDeepLinkPage({ params }: PageProps) {
  const { path } = await params;
  const folderPath = (path ?? []).map(decodeURIComponent).join("/");

  let initialFolderId: string | null = null;
  if (folderPath) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cloud_folders")
      .select("id")
      .eq("folder_path", folderPath)
      .is("deleted_at", null)
      .maybeSingle();
    initialFolderId = data?.id ?? null;
  }

  return <PageShell initialFolderId={initialFolderId} />;
}
