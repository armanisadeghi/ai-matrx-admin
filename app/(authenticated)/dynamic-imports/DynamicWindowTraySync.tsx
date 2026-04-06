"use client";

import dynamic from "next/dynamic";

const WindowTraySync = dynamic(
  () => import("@/features/floating-window-panel/WindowTraySync"),
  { ssr: false },
);

export function DynamicWindowTraySync() {
  return <WindowTraySync />;
}
