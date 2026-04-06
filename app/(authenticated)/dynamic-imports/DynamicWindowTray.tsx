"use client";

import dynamic from "next/dynamic";

const WindowTray = dynamic(
  () => import("@/features/floating-window-panel/WindowTray"),
  { ssr: false },
);

export function DynamicWindowTray() {
  return <WindowTray />;
}
