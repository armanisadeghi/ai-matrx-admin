/**
 * app/(a)/cloud-files/activity/page.tsx
 *
 * Activity feed — "Coming soon" placeholder. Needs a `cld_file_activity`
 * table before it can be wired up.
 */

import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesActivityPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="activity" initialSidebarMode={sidebarMode} />;
}
