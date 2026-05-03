"use client";

/**
 * StudioPanelGroup
 *
 * Client wrapper for the 4-column resizable shell. Renders react-resizable-panels
 * v4 `<Group>` and persists the layout to a cookie on `onLayoutChanged`. The
 * server route reads the same cookie via `decodeStudioLayoutCookie` (in the
 * sibling `studioPanelCookie.ts`, which is not a client module) and seeds
 * `defaultLayout` so the first paint matches the stored widths.
 *
 * The handle is the project-styled `<ResizableHandle />` from
 * `components/ui/resizable.tsx`. Don't reinvent the focus / hover / dragging
 * styles per call site.
 */

import type { ReactNode } from "react";
import { Group, type Layout } from "react-resizable-panels";
import { ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import {
  STUDIO_COLUMN_COOKIE_NAME,
  STUDIO_COLUMN_DEFAULT_LAYOUT,
  STUDIO_COLUMN_GROUP_ID,
} from "./studioPanelCookie";

interface StudioPanelGroupProps {
  /** Server-read cookie value, passed in for SSR-correct first paint. */
  defaultLayout?: Layout;
  className?: string;
  children: ReactNode;
}

export function StudioPanelGroup({
  defaultLayout,
  className,
  children,
}: StudioPanelGroupProps) {
  return (
    <Group
      id={STUDIO_COLUMN_GROUP_ID}
      orientation="horizontal"
      defaultLayout={defaultLayout ?? STUDIO_COLUMN_DEFAULT_LAYOUT}
      onLayoutChanged={(layout) => {
        // Past tense: fires on pointer-up only. Avoids a write storm on every
        // mousemove during a drag.
        const value = encodeURIComponent(JSON.stringify(layout));
        document.cookie = `${STUDIO_COLUMN_COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`;
      }}
      className={cn("flex h-full w-full", className)}
    >
      {children}
    </Group>
  );
}

export { ResizableHandle as StudioColumnHandle };
// Re-export the cookie helpers for convenience so callers only need one import
// path. The server-only helpers live in `studioPanelCookie.ts`.
export {
  STUDIO_COLUMN_COOKIE_NAME,
  STUDIO_COLUMN_DEFAULT_LAYOUT,
  STUDIO_COLUMN_GROUP_ID,
  STUDIO_COLUMN_PANEL_IDS,
  decodeStudioLayoutCookie,
} from "./studioPanelCookie";
