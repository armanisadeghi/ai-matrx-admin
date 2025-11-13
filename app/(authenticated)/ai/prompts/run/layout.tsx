import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Run Prompt route
export const metadata = createRouteMetadata("/ai/prompts/run", {
  title: "Run Prompt",
  description: "Execute and test AI prompt",
});

export default function RunPromptLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

