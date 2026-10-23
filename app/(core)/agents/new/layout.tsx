import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/agents/new", {
  title: "Create New Agent",
  description: "Choose how to create a new AI agent",
});

export default function NewAgentLayout({ children }: { children: ReactNode }) {
  // The module layout above draws the derived trail for every page here (crumb doors).
  return <>{children}</>;
}
