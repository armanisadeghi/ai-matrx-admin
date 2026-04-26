/**
 * app/(a)/cloud-files/recents/page.tsx
 *
 * Recents view — surfaces the most recently updated files across the entire
 * tree. The actual filtering + sort lives in `row-data.ts` (driven by the
 * `recents` filter chip the page auto-applies via PageShell). No server-side
 * query needed; the tree is already in Redux from the layout's realtime
 * provider.
 */

import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesRecentsPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="recents" initialSidebarMode={sidebarMode} />;
}
