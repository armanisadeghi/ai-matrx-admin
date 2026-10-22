import { openOverlay, mintInstanceId } from "@ai-matrx/summon/boot";
import type { OverlayId } from "@ai-matrx/summon/open";
// Plain-data metadata only (id / instance / windowId), fetched on the first click: the shell's nav
// reaches this file on every route, and the index (every overlay's row, 27 KB) is first-load weight
// a page never uses until a tile is pressed (W4 2026-10-17). Never `definitions/register` or
// `definitions/registry` here: they import every overlay definition (the knowledge command bar
// reaches this file from a lab page: the lab build went from seconds to an 8 GB OOM, v0.4.3309).
const loadOverlayMeta = () => import("@/features/overlays/definitions/overlay-meta-index");
import {
  TOOLS_GRID_TILES,
  type TileContext,
  type ToolsGridTile,
} from "./toolsGridTiles";

function findTile(tileId: string): ToolsGridTile | undefined {
  return TOOLS_GRID_TILES.find((t) => t.id === tileId);
}

/** Shared activation path for ToolsGrid tiles and shell nav panel actions. */
export function activateToolsGridTile(
  tileId: string,
  ctx: TileContext,
): boolean {
  const tile = findTile(tileId);
  if (!tile) {
    // eslint-disable-next-line no-console
    console.warn(`[ToolsGrid] unknown tile id "${tileId}"`);
    return false;
  }

  if (tile.onActivate) {
    tile.onActivate(ctx);
    return true;
  }

  if (!tile.overlayId) return false;

  const overlayId = tile.overlayId;
  // seedData may be async (e.g. a Mandate resolution) — dispatch once it and the metadata settle.
  // Activation still reports success synchronously: the tile matched and the open is in flight.
  let declined = false;
  const seeded = Promise.resolve(tile.seedData?.(ctx)).catch((error: unknown) => {
    // "Not now" on the organization question opens nothing, says nothing.
    // A broken seed must not eat the click — open unseeded, loudly.
    console.error(`[ToolsGrid] tile "${tile.id}" seedData failed:`, error);
    return undefined;
  });
  void Promise.all([loadOverlayMeta(), seeded]).then(([{ OVERLAY_META_INDEX }, data]) => {
    if (declined) return;
    const entry = OVERLAY_META_INDEX.find((row) => row.id === overlayId);
    if (!entry) {
      console.warn(`[ToolsGrid] tile "${tile.id}" points at overlayId "${overlayId}" which is not registered`);
      return;
    }
    const strategy = tile.instanceStrategy ?? (entry.instance === "multi" ? "fresh-per-click" : "singleton-default");
    const instanceId = strategy === "fresh-per-click" ? mintInstanceId(entry.id) : undefined;
    ctx.dispatch(
      openOverlay({
        overlayId: entry.id as OverlayId,
        ...(instanceId ? { instanceId } : {}),
        ...(data ? { data } : {}),
      }),
    );
  });
  return true;
}
