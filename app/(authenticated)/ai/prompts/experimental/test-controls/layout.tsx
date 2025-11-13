import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Test Controls route
export const metadata = createRouteMetadata("/ai/prompts/experimental/test-controls", {
  title: "Test Controls",
  description: "Configure and manage testing parameters",
});

export default function TestControlsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

