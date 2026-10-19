"use client";

// ShellDockItems — the phone Dock's rows from THE LAYOUT (custom-experience §5.3). With no saved layout
// the rows are nav-data's `dockItems` themselves (the old server render, unchanged); a saved Dock was
// seeded into the store on the server, so the first frame is already the person's own, and a save
// re-renders it live. A Tools-grid tile row runs the tile in place instead of navigating.

import ShellIcon from "../ShellIcon";
import { MobileDockItem } from "./MobileDockItems";
import { navItemsForViewer } from "../../constants/nav-data";
import { useRunNavTile } from "../../navigation/navPanelActions";
import { useResolvedShellLayout } from "@/features/shell/shell-layout/useResolvedShellLayout";

export default function ShellDockItems({ isAuthenticated }: { isAuthenticated: boolean }) {
  const layout = useResolvedShellLayout();
  const runTile = useRunNavTile();
  const items = navItemsForViewer(layout.dock, isAuthenticated);
  return (
    <>
      {items.map((item) => {
        const tileId = item.tileId;
        return tileId ? (
          <button key={item.id} type="button" className="shell-dock-item" aria-label={item.label} onClick={() => runTile(tileId)}>
            <ShellIcon name={item.iconName} size={22} strokeWidth={1.75} />
          </button>
        ) : (
          <MobileDockItem key={item.href} item={item} />
        );
      })}
    </>
  );
}
