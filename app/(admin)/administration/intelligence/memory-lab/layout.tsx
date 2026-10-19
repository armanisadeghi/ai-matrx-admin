import type { ReactNode } from "react";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  title: "Memory Lab",
  description: "Replay one person's chats through the memory agents into a sandbox store",
  letter: "ML",
  canonicalPath: "/administration/intelligence/memory-lab",
});

export default function MemoryLabLayout({ children }: { children: ReactNode }) {
  return children;
}
