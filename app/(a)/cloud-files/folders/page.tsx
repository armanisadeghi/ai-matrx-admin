/**
 * app/(a)/cloud-files/folders/page.tsx
 *
 * Folder explorer — a tree view of all folders, reached from the left icon
 * rail's Folders icon. The shell renders its FolderExplorer sub-view when
 * section === "folders".
 */

import { PageShell } from "@/features/files";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesFoldersPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="folders" initialSidebarMode={sidebarMode} />;
}
