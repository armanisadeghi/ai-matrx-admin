import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { AgentShortcutsLayoutClient } from "./AgentShortcutsLayoutClient";

export const metadata = createRouteMetadata("/agents", {
  titlePrefix: "Shortcuts",
  title: "Agents",
  description:
    "Manage your personal agent shortcuts, categories, and content blocks",
  letter: "MS",
});

export default function UserAgentShortcutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentShortcutsLayoutClient>{children}</AgentShortcutsLayoutClient>;
}
