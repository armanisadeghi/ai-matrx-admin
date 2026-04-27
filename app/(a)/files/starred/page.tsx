/**
 * app/(a)/files/starred/page.tsx
 *
 * Starred items — "Coming soon" placeholder. Needs a `cld_user_stars` table
 * before it can be wired up.
 */

import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesStarredPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="starred" initialSidebarMode={sidebarMode} />;
}
