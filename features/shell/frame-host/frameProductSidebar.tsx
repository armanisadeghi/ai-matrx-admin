"use client";

// THE PRODUCT'S OWN SIDEBAR IN THE FRAME (owner, 2026-10-22: in the new app frame there is exactly
// ONE sidebar column, the frame's, and it shows the current product's own navigation).
//
// Three sources, most specific first:
//   1. the PAGE's own sidebar, handed over through <FrameSidebarContent> (frameSidebarSlot.tsx —
//      Notes' list, Files' folders): the frame renders a node in its sidebar body and the page's
//      content is portalled into it;
//   2. a Large Route family's REGISTERED menu (constants/route-menu-registry — Chat, Marketing,
//      Code, Images, Your staff, Agent runs, Research topic, Settings): the classic sidebar flips
//      into it or shows it as the domain panel; the frame renders the SAME component, loaded by
//      the registry's own loader (no second copy, no new chunk);
//   3. otherwise the route table's rows (the frame's default).
// A family whose classic sidebar opens on the main menu (`defaultView: "main"`, the canvas
// workspace's chat history behind a switch) is not the product's navigation: the rows stay.
//
// Only FrameHostImpl imports this file (it is inside the frame's one chunk).
import type { ReactNode } from "react";
import {
  routeMenuDefaultView,
  routeMenuRegistry,
  type RouteMenuEntry,
} from "@/features/shell/constants/route-menu-registry";
import { ModuleSlot } from "@/features/shell/frame/FrameModules";
import { useFrameSidebarSlotHost, type FrameSidebarSlotHost } from "./frameSidebarSlot";

/** The registered menu that IS this route's product navigation in the frame, or null. */
export function frameRouteMenu(pathname: string): RouteMenuEntry | null {
  const entry = routeMenuRegistry.find((e) => e.pathPattern.test(pathname)) ?? null;
  return entry && routeMenuDefaultView(entry) === "route" ? entry : null;
}

/** A registered route menu in the frame's sidebar body: its rows always expanded. */
export function FrameRouteMenu({ entry, icon }: { entry: RouteMenuEntry; icon: ReactNode }) {
  return (
    <div data-mf-route-menu={entry.label} className="shell-sidebar-route-nav px-2 pb-2">
      <ModuleSlot bare loader={entry.importFn} props={{ expanded: true }} title={entry.label} icon={icon} />
    </div>
  );
}

/**
 * The host half: the slot to provide around the page body, and what the frame's sidebar body shows
 * (undefined = the route table's rows).
 */
export function useFrameProductSidebar(
  pathname: string,
  icon: ReactNode,
): { slotHost: FrameSidebarSlotHost; sidebarContent: ReactNode } {
  const slot = useFrameSidebarSlotHost();
  const routeMenu = frameRouteMenu(pathname);
  const sidebarContent = slot.claimed ? (
    <div ref={slot.setTarget} data-mf-page-sidebar="" className="flex min-h-0 flex-1 flex-col" />
  ) : routeMenu ? (
    <FrameRouteMenu entry={routeMenu} icon={icon} />
  ) : undefined;
  return { slotHost: slot.host, sidebarContent };
}
