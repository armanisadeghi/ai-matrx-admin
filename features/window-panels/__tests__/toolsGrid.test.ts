/**
 * toolsGrid.test.ts — every declarative grid tile either references a
 * registered overlay or provides its own onActivate handler.
 *
 * Prevents drift: renaming an overlayId in the registry without updating
 * the Tools grid would silently produce no-op tiles. This test fails loudly.
 */
import { TOOLS_GRID_TILES, TOOLS_CATEGORIES } from "../tools-grid/toolsGridTiles";
import { ALL_WINDOW_REGISTRY_ENTRIES } from "../registry/windowRegistry";

describe("Tools grid config", () => {
  const registeredOverlayIds = new Set(
    ALL_WINDOW_REGISTRY_ENTRIES.map((e) => e.overlayId),
  );

  describe("structural integrity", () => {
    it("has tiles", () => {
      expect(TOOLS_GRID_TILES.length).toBeGreaterThan(30);
    });

    it("every tile has a stable id", () => {
      const ids = new Set<string>();
      for (const tile of TOOLS_GRID_TILES) {
        expect(tile.id).toBeTruthy();
        expect(ids.has(tile.id)).toBe(false);
        ids.add(tile.id);
      }
    });

    it("every tile has label, icon, category", () => {
      for (const tile of TOOLS_GRID_TILES) {
        expect(tile.label).toBeTruthy();
        expect(tile.icon).toBeDefined();
        expect(tile.category).toBeTruthy();
      }
    });
  });

  describe("overlay references", () => {
    it("every overlayId-bearing tile points at a registered overlay", () => {
      const broken: Array<{ id: string; overlayId: string }> = [];
      for (const tile of TOOLS_GRID_TILES) {
        if (tile.overlayId && !registeredOverlayIds.has(tile.overlayId)) {
          broken.push({ id: tile.id, overlayId: tile.overlayId });
        }
      }
      expect(broken).toEqual([]);
    });

    it("every tile has either overlayId or onActivate (not neither)", () => {
      for (const tile of TOOLS_GRID_TILES) {
        expect(tile.overlayId || typeof tile.onActivate === "function").toBeTruthy();
      }
    });
  });

  describe("categories", () => {
    it("every tile category is declared in TOOLS_CATEGORIES", () => {
      const declared = new Set(TOOLS_CATEGORIES.map((c) => c.id));
      for (const tile of TOOLS_GRID_TILES) {
        expect(declared.has(tile.category)).toBe(true);
      }
    });

    it('admin category has "admin" gate', () => {
      const admin = TOOLS_CATEGORIES.find((c) => c.id === "admin");
      expect(admin?.gate).toBe("admin");
    });

    it("admin-gated tiles all live in admin category", () => {
      for (const tile of TOOLS_GRID_TILES) {
        if (tile.gate === "admin") {
          expect(tile.category).toBe("admin");
        }
      }
    });
  });

  describe("instance strategy", () => {
    it('"fresh-per-click" tiles reference multi-instance overlays', () => {
      const byId = new Map(
        ALL_WINDOW_REGISTRY_ENTRIES.map((e) => [e.overlayId, e]),
      );
      const mismatches: Array<{ id: string; overlayId: string }> = [];
      for (const tile of TOOLS_GRID_TILES) {
        if (tile.instanceStrategy !== "fresh-per-click") continue;
        if (!tile.overlayId) continue;
        const entry = byId.get(tile.overlayId);
        if (entry && entry.instanceMode !== "multi") {
          // "fresh-per-click" on a singleton would generate stale instance
          // ids that never match the one selector reads from.
          mismatches.push({ id: tile.id, overlayId: tile.overlayId });
        }
      }
      // NOTE: notesBetaWindow intentionally has a "fresh-per-click" tile
      // (the "Notes Beta" companion) and is registered as multi.
      expect(mismatches).toEqual([]);
    });
  });
});
