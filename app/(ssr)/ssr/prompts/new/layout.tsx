import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the New Prompt route
export const metadata = createRouteMetadata("/ai/prompts/new", {
  title: "New Prompt",
  description: "Create a new AI prompt",
});

export default function NewPromptLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

