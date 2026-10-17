import { openOverlay } from "@ai-matrx/summon";
import type { OverlayId } from "@ai-matrx/summon";
// Plain-data metadata only (id / instance / windowId). Never `definitions/register` or
// `definitions/registry` here: they import every overlay definition, and each definition's
// `render: () => import(...)` drags that window's whole implementation into any graph that
// reaches this file (the knowledge command bar reaches it from a lab page: the lab build went
// from seconds to an 8 GB OOM, v0.4.3309).
import { OVERLAY_META_INDEX } from "@/features/overlays/definitions/overlay-meta-index";
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

  const entry = OVERLAY_META_INDEX.find((row) => row.id === tile.overlayId);
  if (!entry) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ToolsGrid] tile "${tile.id}" points at overlayId "${tile.overlayId}" which is not registered`,
    );
    return false;
  }

  const strategy =
    tile.instanceStrategy ??
    (entry.instance === "multi" ? "fresh-per-click" : "singleton-default");

  const instanceId =
    strategy === "fresh-per-click" ? `${(entry.window?.windowId ?? entry.id)}-${Date.now()}` : undefined;

  // seedData may be async (e.g. a Mandate resolution) — dispatch once it
  // settles. Activation still reports success synchronously: the tile matched
  // and the open is in flight.
  let declined = false;
  void Promise.resolve(tile.seedData?.(ctx))
    .catch((error: unknown) => {
      // "Not now" on the organization question opens nothing, says nothing.
      // A broken seed must not eat the click — open unseeded, loudly.
      console.error(`[ToolsGrid] tile "${tile.id}" seedData failed:`, error);
      return undefined;
    })
    .then((data) => {
      if (declined) return;
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
