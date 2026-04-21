import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { AgentShortcutsLayoutClient } from "./AgentShortcutsLayoutClient";

export const metadata = createRouteMetadata("/administration", {
  title: "Agent Shortcuts",
  description:
    "Manage global-scope agent shortcuts, categories, and content blocks",
  letter: "AS",
});

export default function AgentShortcutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentShortcutsLayoutClient>{children}</AgentShortcutsLayoutClient>;
}
