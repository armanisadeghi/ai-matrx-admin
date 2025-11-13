import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Experimental Prompts route
export const metadata = createRouteMetadata("/ai/prompts/experimental", {
  title: "Experimental Prompts",
  description: "Explore and test cutting-edge prompt engineering tools",
});

export default function ExperimentalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

