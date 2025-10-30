// /layout.tsx

import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata with automatic favicon for the AI Cockpit route
export const metadata = createRouteMetadata("/ai/cockpit", {
  title: "AI Cockpit",
  description: "Your AI command center",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-hidden">
    {children}</div>;
}
