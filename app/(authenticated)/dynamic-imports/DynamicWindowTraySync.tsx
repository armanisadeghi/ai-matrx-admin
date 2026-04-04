"use client";

import dynamic from "next/dynamic";

const WindowTraySync = dynamic(
  () =>
    import("@/components/official-candidate/floating-window-panel/WindowTraySync"),
  { ssr: false },
);

export function DynamicWindowTraySync() {
  return <WindowTraySync />;
}
