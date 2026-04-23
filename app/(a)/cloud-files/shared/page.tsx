/**
 * app/(a)/cloud-files/shared/page.tsx
 *
 * Shared files + folders — everything with visibility of public/shared or
 * explicit grantees. Filtering is client-side over the already-loaded tree.
 */

import { PageShell } from "@/features/files";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesSharedPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="shared" initialSidebarMode={sidebarMode} />;
}
