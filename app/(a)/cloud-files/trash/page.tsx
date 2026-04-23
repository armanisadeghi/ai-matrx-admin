/**
 * app/(a)/cloud-files/trash/page.tsx
 *
 * Deleted files. Renders the Dropbox-style shell with `section="trash"` —
 * the row-data filter picks out every soft-deleted file and folder across
 * the user's tree.
 */

import { PageShell } from "@/features/files";
import { readSidebarModeCookie } from "@/features/files/utils/server-cookies";

export default async function CloudFilesTrashPage() {
  const sidebarMode = await readSidebarModeCookie();
  return <PageShell section="trash" initialSidebarMode={sidebarMode} />;
}
