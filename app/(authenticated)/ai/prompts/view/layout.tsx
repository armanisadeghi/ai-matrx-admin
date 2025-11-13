import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the View Prompt route
export const metadata = createRouteMetadata("/ai/prompts/view", {
  title: "View Prompt",
  description: "View prompt details",
});

export default function ViewPromptLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

