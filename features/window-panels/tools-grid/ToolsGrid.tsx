"use client";

/**
 * ToolsGrid — data-driven replacement for the ~570 lines of hand-written
 * MenuGridItem JSX that used to live inside SidebarWindowToggle.tsx.
 *
 * Reads `TOOLS_GRID_TILES` + `TOOLS_CATEGORIES`, groups tiles by category,
 * and renders the familiar MenuSection / MenuGridItem / MenuDivider pattern.
 *
 * Admin-gated categories and tiles are filtered using the `isAdmin` selector.
 * Each tile's click handler resolves its registry entry to decide singleton
 * vs multi-instance semantics, runs the optional `seedData` builder, then
 * dispatches `openOverlay(...)` — or calls the tile's custom `onActivate`.
 */
import { Fragment, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { getRegistryEntryByOverlayId } from "@/features/window-panels/registry/windowRegistry";
import {
  MenuDivider,
  MenuGridItem,
  MenuSection,
} from "./menuPrimitives";
import {
  TOOLS_CATEGORIES,
  TOOLS_GRID_TILES,
  type ToolsCategory,
  type ToolsGridTile,
  type TileContext,
} from "./toolsGridTiles";

interface ToolsGridProps {
  /**
   * Called after a tile is activated so the shell can close the popover.
   * Matches the legacy `act(() => ...)` wrapper that used to be inlined per
   * tile inside SidebarWindowToggle.
   */
  onAfterActivate?: () => void;
  /**
   * Which section to render. "tools" = non-admin categories; "admin" = admin
   * category only. Lets SidebarWindowToggle keep its two-tab layout intact.
   */
  section: "tools" | "admin";
}

export default function ToolsGrid({
  onAfterActivate,
  section,
}: ToolsGridProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const isAdmin = useAppSelector(selectIsAdmin);

  // Build the tile-click handler once. Each tile's own click closure binds
  // only the tile reference; all side-effects resolve from registry + ctx.
  const activate = useCallback(
    (tile: ToolsGridTile) => {
      const ctx: TileContext = {
        dispatch,
        getState: store.getState,
        router,
      };

      try {
        if (tile.onActivate) {
          tile.onActivate(ctx);
        } else if (tile.overlayId) {
          const entry = getRegistryEntryByOverlayId(tile.overlayId);
          if (!entry) {
            // eslint-disable-next-line no-console
            console.warn(
              `[ToolsGrid] tile "${tile.id}" points at overlayId "${tile.overlayId}" which is not registered`,
            );
            return;
          }
          const strategy =
            tile.instanceStrategy ??
            (entry.instanceMode === "multi"
              ? "fresh-per-click"
              : "singleton-default");

          const data = tile.seedData?.(ctx);
          const instanceId =
            strategy === "fresh-per-click"
              ? `${entry.slug}-${Date.now()}`
              : undefined;

          dispatch(
            openOverlay({
              overlayId: entry.overlayId,
              ...(instanceId ? { instanceId } : {}),
              ...(data ? { data } : {}),
            }),
          );
        }
      } finally {
        onAfterActivate?.();
      }
    },
    [dispatch, store, router, onAfterActivate],
  );

  // Filter categories by section + admin gate.
  const visibleCategories = TOOLS_CATEGORIES.filter((cat) => {
    if (section === "admin" && cat.id !== "admin") return false;
    if (section === "tools" && cat.id === "admin") return false;
    if (cat.gate === "admin" && !isAdmin) return false;
    return true;
  });

  // Filter tiles the same way.
  const tilesByCategory = new Map<ToolsCategory, ToolsGridTile[]>();
  for (const tile of TOOLS_GRID_TILES) {
    if (tile.gate === "admin" && !isAdmin) continue;
    if (section === "admin" && tile.category !== "admin") continue;
    if (section === "tools" && tile.category === "admin") continue;
    const bucket = tilesByCategory.get(tile.category) ?? [];
    bucket.push(tile);
    tilesByCategory.set(tile.category, bucket);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto mt-1">
      {visibleCategories.map((cat, idx) => {
        const tiles = tilesByCategory.get(cat.id) ?? [];
        if (tiles.length === 0) return null;
        return (
          <Fragment key={cat.id}>
            {idx > 0 && <MenuDivider />}
            {/* Admin section has no "Admin" header in the legacy layout — the
                entire tab is admin. Keep the header for "tools" section only. */}
            {section === "tools" && <MenuSection label={cat.label} />}
            <div
              className={
                section === "admin"
                  ? "grid grid-cols-2 gap-1.5 px-2 pb-2 mt-1"
                  : "grid grid-cols-2 gap-1.5 px-2 pb-2"
              }
            >
              {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <MenuGridItem
                    key={tile.id}
                    icon={<Icon className="w-3.5 h-3.5" />}
                    label={tile.label}
                    onClick={() => activate(tile)}
                  />
                );
              })}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
