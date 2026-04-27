/**
 * app/(a)/files/requests/page.tsx
 *
 * File requests — "Coming soon" placeholder. Backend schema for request
 * inboxes is a follow-up phase.
 */

import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesRequestsPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="requests" initialSidebarMode={sidebarMode} />;
}
