"use client";

// THE PAGE'S SIDEBAR GOES INTO THE FRAME'S ONE SIDEBAR COLUMN (owner, 2026-10-22: each product has
// its own sidebar; in the new app frame there is exactly ONE sidebar column, the frame's).
//
// A page that draws its own navigation column (Notes' list, Files' folders) wraps that column's
// CONTENT in <FrameSidebarContent>. Inside the frame (FrameHostImpl provides the host around the
// page body) the content is portalled into the frame's sidebar body, in place of the route table's
// rows, and the frame's width and resize govern it; the page then drops its own column chrome
// (resizable panel, border, collapse rail) — `useFrameSidebarSlot()` answers true. Outside the
// frame there is no host: the content renders where it stands, so the classic page is unchanged
// and the page's sidebar is ONE component in both shells.
//
// Tiny and eager on purpose: classic pages import it, so it carries nothing of the frame.
// Kind-A menus (a Large Route's registered menu, route-menu-registry) need no door: the frame
// host renders them itself.
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * THE ROUTES WHOSE PAGE HANDS THE FRAME ITS SIDEBAR (kind B) — the ONE declared list. The frame
 * reserves its sidebar body (a quiet skeleton, never the route rows) on these routes until the page
 * claims it, so the rows never flash first. `owner` is the file that renders <FrameSidebarContent>
 * (a test holds the two in step). A page that adopts the door adds its route here.
 */
export const FRAME_PAGE_SIDEBAR_ROUTES: readonly { pattern: RegExp; owner: string }[] = [
  { pattern: /^\/notes(\/|$)/, owner: "features/notes/components/NotesView.tsx" },
  { pattern: /^\/files(\/|$)/, owner: "features/files/components/surfaces/PageShell.tsx" },
  { pattern: /^\/messages(\/|$)/, owner: "app/(core)/messages/MessagesLayoutClient.tsx" },
  {
    pattern: /^\/agent-connections(\/|$)/,
    owner: "features/agent-connections/components/AgentConnectionsRouteShell.tsx",
  },
];

/** The declared kind-B entry this route falls under (its owner file), or null. */
export function pageSidebarOwner(pathname: string): string | null {
  return FRAME_PAGE_SIDEBAR_ROUTES.find((r) => r.pattern.test(pathname))?.owner ?? null;
}

/** True when this route's page supplies the frame's sidebar body (kind B). */
export function routeSuppliesPageSidebar(pathname: string): boolean {
  return pageSidebarOwner(pathname) != null;
}

export interface FrameSidebarSlotHost {
  /** The frame's sidebar body node, once a page has claimed it; null until then. */
  target: HTMLElement | null;
  /** Claim the sidebar body for the page's content; returns the release. */
  claim: () => () => void;
}

export const FrameSidebarSlotContext = createContext<FrameSidebarSlotHost | null>(null);

/** True inside the new app frame's page body: the page's sidebar goes to the frame's column. */
export function useFrameSidebarSlot(): boolean {
  return useContext(FrameSidebarSlotContext) != null;
}

/**
 * The page's own sidebar content. In the frame: portalled into the frame's sidebar body (nothing
 * renders in place). Outside it: rendered in place, exactly as before.
 */
export function FrameSidebarContent({ children }: { children: ReactNode }) {
  const host = useContext(FrameSidebarSlotContext);
  const claim = host?.claim;
  useEffect(() => (claim ? claim() : undefined), [claim]);
  if (!host) return <>{children}</>;
  return host.target ? createPortal(children, host.target) : null;
}

/**
 * The host half (FrameHostImpl): the context value, whether a page has claimed the sidebar, and the
 * ref for the node the frame renders in its sidebar body while claimed.
 */
export function useFrameSidebarSlotHost(): {
  host: FrameSidebarSlotHost;
  claimed: boolean;
  setTarget: (node: HTMLElement | null) => void;
} {
  const [claims, setClaims] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [claim] = useState(() => () => {
    setClaims((n) => n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setClaims((n) => n - 1);
    };
  });
  const claimed = claims > 0;
  return { host: { target: claimed ? target : null, claim }, claimed, setTarget };
}
