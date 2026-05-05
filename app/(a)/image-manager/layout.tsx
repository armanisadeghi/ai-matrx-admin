/**
 * app/(a)/image-manager/layout.tsx
 *
 * Server Component shell for the Image Manager route. Resolves the user
 * id server-side and mounts `<CloudFilesRealtimeProvider>` so the
 * cloud-files Redux slice hydrates with the current user's tree on
 * first mount and stays live via the realtime channel.
 *
 * This is the same provider used by `/files`, so the "Your Cloud" tab
 * inside the manager renders identically to what the user sees in the
 * Files route — same RPC, same selectors, same realtime echo dedup.
 */

import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { createRouteMetadata } from "@/utils/route-metadata";
import { CloudFilesRealtimeProvider } from "@/features/files/providers/CloudFilesRealtimeProvider";

export const metadata = createRouteMetadata("/image-manager", {
  title: "Image Manager",
  description:
    "Browse, upload, and create images — every upload lands in your cloud and stays in sync across every Matrx surface.",
  letter: "Im",
  additionalMetadata: {
    keywords: [
      "image manager",
      "image picker",
      "image library",
      "cloud images",
      "upload images",
      "image studio",
    ],
  },
});

export default async function ImageManagerLayout({
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
