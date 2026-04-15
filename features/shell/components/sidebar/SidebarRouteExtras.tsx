"use client";
import dynamic from "next/dynamic";
// SidebarRouteExtras — client island that watches the pathname and mounts
// route-specific sidebar content. Lives inside <aside class="shell-sidebar">
// so it stays in the correct grid area. Mounts/unmounts content reactively
// on every client navigation without requiring a layout re-render.

import { usePathname } from "next/navigation";

const AgentBuildSidebarExtras = dynamic(
  () =>
    import("@/features/agents/components/shell/AgentBuildSidebarExtras").then(
      (mod) => ({ default: mod.AgentBuildSidebarExtras }),
    ),
  { ssr: false },
);

export default function SidebarRouteExtras() {
  const pathname = usePathname();

  if (/^\/agents\/[^/]+\/build(\/|$)/.test(pathname)) {
    return <AgentBuildSidebarExtras />;
  }

  return null;
}
