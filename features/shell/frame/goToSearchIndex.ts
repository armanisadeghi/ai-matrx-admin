// THE ONE FULL "GO TO" INDEX, for every frame search: the Go-to palette (Cmd/Ctrl+Shift+K) and the
// app grid's search field (owner, 2026-10-22: the grid's search must find everything, not only the
// product tiles). Products, sidebar rows, every page with a home row (GO_TO_PAGES) and the host's
// menu entries, ranked by searchEngine.ts. Heavy (every page): only GoToPalette imports it
// statically, and the palette is lazy; the app grid imports it on its first keystroke.
import { buildGoToIndex } from "./goToIndex";
import type { GoToEntry } from "./goToIndex";
import { GO_TO_PAGES } from "./go-to-pages.generated";
import { FRAME_ROUTE_HOMES } from "./route-homes.generated";
import type { FrameProduct, ProductFamily } from "./types";

export function fullGoToIndex(
  products: readonly FrameProduct[],
  families: readonly { id: ProductFamily; label: string }[],
  extras: readonly GoToEntry[] = [],
): GoToEntry[] {
  return buildGoToIndex(products, families, FRAME_ROUTE_HOMES, extras, GO_TO_PAGES);
}
