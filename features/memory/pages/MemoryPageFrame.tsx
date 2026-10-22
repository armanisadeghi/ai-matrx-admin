// features/memory/pages/MemoryPageFrame.tsx
//
// The shared chrome of a /memory/* page: the page-top template (one line:
// back + Memory crumb + page name + actions) and a scrolling body.

import type { ReactNode } from "react";
import {
  RecordPageHeader,
  type RecordPageAction,
} from "@/features/shell/components/header/templates/RecordPageHeader";

export function MemoryPageFrame({
  name,
  actions,
  children,
  wide = false,
  fill = false,
}: {
  name: string;
  actions?: RecordPageAction[];
  children: ReactNode;
  wide?: boolean;
  /** A workspace body that owns its own scrolling (list + editor panes). */
  fill?: boolean;
}) {
  return (
    <>
      <RecordPageHeader
        backHref="/memory"
        parents={[{ label: "Memory", href: "/memory" }]}
        level={{ name }}
        actions={actions}
      />
      <div className="flex h-full flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)]">
        <div
          className={`mx-auto flex min-h-0 w-full flex-1 flex-col p-4 md:p-6 ${
            fill ? "max-w-7xl overflow-hidden" : `overflow-y-auto ${wide ? "max-w-5xl" : "max-w-3xl"}`
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
