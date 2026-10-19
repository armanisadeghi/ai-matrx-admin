"use client";

// ShellSidebarNav — the sidebar's main rows, from THE LAYOUT (custom-experience §5.3).
//
// The rows come from `useResolvedShellLayout`: with no saved layout that is `primaryNavItems` itself, so
// the uncustomized render is exactly the old server map (same rows, same classes, same order). A saved
// layout was seeded into the store by the (core) layout, so the server render of this island is already
// the person's own menu (first frame, no swap), and a save re-renders it live. The HTML carries no nav
// tree: this island resolves from the store and the nav data its chunk already holds (2026-10-15 lesson).
//
// A row with `tileId` launches a Tools-grid tile in place (its href is a `#tile.*` anchor that must never
// navigate). While the server reserved the column (a customized person whose seed missed its deadline),
// a fixed-height skeleton holds the place instead of painting the default and then swapping.

import NavItem from "./NavItem";
import NavFlyoutGroup from "./NavFlyoutGroup";
import ShellIcon from "../ShellIcon";
import { navItemsForViewer, navToneIconClass, settingsItem, type ShellNavItem } from "../../constants/nav-data";
import { useRunNavTile } from "../../navigation/navPanelActions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectShellNavReserved, useResolvedShellLayout } from "@/features/shell/shell-layout/useResolvedShellLayout";
import { cn } from "@/lib/utils";

/** Rows the reserve holds while a customized layout is on its way (matches a typical custom menu). */
const RESERVED_ROWS = 12;

function TileNavItem({ item }: { item: ShellNavItem & { tileId: string } }) {
  const runTile = useRunNavTile();
  return (
    <button
      type="button"
      title={item.label}
      className="shell-nav-item shell-tactile-subtle"
      onClick={() => runTile(item.tileId)}
    >
      <span className={cn("shell-nav-icon", navToneIconClass(item.tone))}>
        <ShellIcon name={item.iconName} size={18} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">{item.label}</span>
    </button>
  );
}

export default function ShellSidebarNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const layout = useResolvedShellLayout();
  const reserved = useAppSelector(selectShellNavReserved);
  if (reserved) {
    return (
      <div className="shell-sidebar-route-loading shell-route-ssr-skeleton" aria-hidden data-shell-layout-reserve>
        {Array.from({ length: RESERVED_ROWS }, (_, i) => (
          <div key={i} className="shell-sidebar-route-loading-item" />
        ))}
      </div>
    );
  }
  const visible = navItemsForViewer(layout.sidebar, isAuthenticated);
  const candidates = [...visible, settingsItem];
  return (
    <>
      {visible.map((item) =>
        item.children ? (
          <NavFlyoutGroup key={item.id} item={item} candidates={candidates} />
        ) : item.tileId ? (
          <TileNavItem key={item.id} item={{ ...item, tileId: item.tileId }} />
        ) : (
          <NavItem key={item.id} item={item} />
        ),
      )}
    </>
  );
}
