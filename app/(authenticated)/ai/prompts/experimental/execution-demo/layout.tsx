import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the System Prompts Demo route
export const metadata = createRouteMetadata("/ai/prompts/experimental/execution-demo", {
  title: "System Prompts Demo",
  description: "100% database-driven AI actions demo",
});

export default function ExecutionDemoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

