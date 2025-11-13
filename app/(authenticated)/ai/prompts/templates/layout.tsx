import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Prompt Templates route
export const metadata = createRouteMetadata("/ai/prompts/templates", {
  title: "Prompt Templates",
  description: "Browse and manage prompt templates",
});

export default function TemplatesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

