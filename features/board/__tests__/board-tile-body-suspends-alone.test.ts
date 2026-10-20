/**
 * A tile body that suspends hides only itself. With no Suspense boundary inside the tile the nearest one is
 * the whole board's (next/dynamic's), which React hides with `display: none !important` and reveals, so every
 * tile reflows at once (measured 0.34 layout shift on a six-tile board, 2026-10-16).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(path.resolve(__dirname, "..", "components/BoardTile.tsx"), "utf8");

describe("a tile body suspends alone", () => {
  it("wraps the body in its own Suspense boundary", () => {
    expect(src).toMatch(/<Suspense fallback=\{<TileSkeleton[^>]*\/>\}>\s*(?:<TileAutoHeightContext\.Provider[^>]*>\s*)?<AfterFirstPaint/);
  });
});
