/**
 * app/(a)/files/layout.tsx
 *
 * Server Component shell. Resolves the current user's id server-side, then
 * mounts <CloudFilesRealtimeProvider> (client) so Phase 2's realtime
 * middleware attaches and Phase 2's tree RPC hydrates on mount.
 *
 * Obeys app/(a) rules:
 *   - SSR-first: user id resolved on the server (no client round-trip).
 *   - No `'use cache'` here — the user session is cookie-scoped and the
 *     realtime subscription is inherently user-specific.
 *   - Metadata via createRouteMetadata (shared template).
 */

import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { createRouteMetadata } from "@/utils/route-metadata";
import { CloudFilesRealtimeProvider } from "@/features/files/providers/CloudFilesRealtimeProvider";

export const metadata = createRouteMetadata("/files", {
  title: "Files",
  description:
    "Upload, browse, preview, and share files in a fast, real-time synced file system.",
  additionalMetadata: {
    keywords: [
      "files",
      "cloud files",
      "file manager",
      "upload",
      "share links",
      "preview",
    ],
  },
});

export default async function CloudFilesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <CloudFilesRealtimeProvider userId={user?.id ?? null}>
      {children}
    </CloudFilesRealtimeProvider>
  );
}
