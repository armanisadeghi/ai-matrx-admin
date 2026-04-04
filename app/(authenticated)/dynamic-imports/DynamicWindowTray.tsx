"use client";

import dynamic from "next/dynamic";

const WindowTray = dynamic(
  () =>
    import("@/components/official-candidate/floating-window-panel/WindowTray"),
  { ssr: false },
);

export function DynamicWindowTray() {
  return <WindowTray />;
}
