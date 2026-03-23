import type { ReactNode } from "react";

export default function MetadataToolLayout({ children }: { children: ReactNode }) {
  // The public layout gives us:  h-dvh flex flex-col  →  main = flex-1 min-h-0 overflow-hidden
  // We fill that space and let the page's own overflow-y-auto handle scrolling.
  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
