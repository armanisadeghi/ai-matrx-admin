/**
 * app/(a)/cloud-files/photos/page.tsx
 *
 * Photos view — filters `cld_files` client-side to those with `image/*` mime
 * types. No server-side query; the tree is already in Redux from the layout's
 * realtime provider.
 */

import { PageShell } from "@/features/files/components/surfaces/PageShell";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesPhotosPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="photos" initialSidebarMode={sidebarMode} />;
}
