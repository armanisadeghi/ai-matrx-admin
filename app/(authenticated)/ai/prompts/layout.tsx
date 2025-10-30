import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata with automatic favicon for the Prompt Builder route
export const metadata = createRouteMetadata("/ai/prompts", {
  title: "Prompt Builder",
  description: "Build and manage AI prompts",
});

export default function PromptsLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

