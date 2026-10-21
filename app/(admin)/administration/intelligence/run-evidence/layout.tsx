import type { ReactNode } from "react";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  title: "Run Evidence",
  description: "Every run started from a surface by any agent: tools, context values, cost and why",
  letter: "RE",
  canonicalPath: "/administration/intelligence/run-evidence",
});

export default function RunEvidenceLayout({ children }: { children: ReactNode }) {
  return children;
}
