import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { createRouteMetadata } from "@/utils/route-metadata";
import { CloudFilesRealtimeProvider } from "@/features/files/providers/CloudFilesRealtimeProvider";

export const metadata = createRouteMetadata("/images/manager", {
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

export default async function ImagesManagerLayout({
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
