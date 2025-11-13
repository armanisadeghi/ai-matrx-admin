import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the AI Runs route
export const metadata = createRouteMetadata("/ai/runs", {
  title: "AI Runs",
  description: "View and manage AI execution runs",
});

export default function RunsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

