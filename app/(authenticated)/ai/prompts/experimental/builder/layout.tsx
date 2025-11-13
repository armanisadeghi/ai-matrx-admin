import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Prompt Builder route
export const metadata = createRouteMetadata("/ai/prompts/experimental/builder", {
  title: "Experimental Prompt Builder",
  description: "Advanced prompt construction with structured components",
});

export default function BuilderLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

