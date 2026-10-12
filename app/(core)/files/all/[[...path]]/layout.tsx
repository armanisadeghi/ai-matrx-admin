/**
 * app/(core)/files/all/[[...path]]/layout.tsx
 *
 * Persistent shell for the `/files/all` workspace. PageShell lives here — not
 * in page.tsx — so folder-to-folder navigation does not remount the sidebar,
 * header, or file list chrome. Mirrors the Notes layout pattern: the page
 * slot handles query-string hydration only (`FilesQueryHydrator`).
 *
 * Folder path segments are resolved server-side once per hard navigation;
 * in-app folder browsing updates the URL via `history.pushState` (see
 * `navigateFilesFolderPath`) without re-running this layout.
 */

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { filesDb } from "@/features/files/filesDb";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ path?: string[] }>;
}

export default async function CloudFilesAllLayout({
  children,
  params,
}: LayoutProps) {
  const { isAuthenticated, user } = await getSessionVerdict();

  if (!isAuthenticated || !user) {
    redirect("/files");
  }

  const supabase = await createClient();
  // The App Router already decodes each catch-all segment — decoding again
  // double-decodes a literal `%` in a folder name.
  const { path } = await params;
  const folderPath = (path ?? []).join("/");

  let initialFolderId: string | null = null;
  if (folderPath) {
    // Scoped to the viewer's OWN folders. `folder_path` is not globally unique
    // — `files.folders` is UNIQUE on (created_by, organization_id, folder_path)
    // (a person's folder tree is per organization, 2026-10-12), so the viewer
    // can hold one folder at this path in each of their organizations. A read
    // never narrows to the active organization; the most recently touched one
    // opens (`maybeSingle()` on several rows is PGRST116 and silently dropped
    // the folder id).
    const { data } = await filesDb(supabase)
      .from("folders")
      .select("id")
      .eq("created_by", user.id)
      .eq("folder_path", folderPath)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1);
    initialFolderId = data?.[0]?.id ?? null;
  }

  const sidebarMode = await readSidebarModeCookie();

  return (
    <>
      <PageShell
        section="all"
        initialFolderId={initialFolderId}
        initialFolderPath={folderPath || null}
        initialSidebarMode={sidebarMode}
      />
      <div style={{ display: "none" }} aria-hidden>
        {children}
      </div>
    </>
  );
}
