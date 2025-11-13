import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Prompt Overlay Test route
export const metadata = createRouteMetadata("/ai/prompts/experimental/prompt-overlay-test", {
  title: "Prompt Overlay Test",
  description: "Test and validate prompt overlay functionality",
});

export default function PromptOverlayTestLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

