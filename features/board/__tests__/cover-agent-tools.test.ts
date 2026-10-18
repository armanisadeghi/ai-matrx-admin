/**
 * An agent can make and edit a COVER (2026-10-18). SUT: `tools/board-tools.ts` (the `cover` kind and
 * the `hero` param on board_add_tile / board_update_tile) and `items/cover-source.ts` (the one source
 * shape the agent tools and the cover body share). Breaks it catches: the kind or the hero param
 * missing from the tool vocabulary; an agent's cover saved in a shape the cover body cannot read.
 */
import { BOARD_TILE_KINDS, BOARD_CLIENT_TOOLS } from "../tools/board-tools";
import { coverOf, coverSource } from "../items/cover-source";

describe("cover agent tools", () => {
  it("board_add_tile offers a cover with a hero, board_update_tile edits it", () => {
    expect(BOARD_TILE_KINDS).toContain("cover");
    for (const name of ["board_add_tile", "board_update_tile"]) {
      const tool = BOARD_CLIENT_TOOLS.find((t) => t.name === name)!;
      expect(Object.keys((tool.inputSchema as { properties: Record<string, unknown> }).properties)).toContain("hero");
    }
  });

  it("a cover source round-trips its hero and prose", () => {
    const s = coverSource({ hero: "<h1>Acme</h1>", markdown: "Our system." });
    expect(s).toEqual({ kind: "entity", entity: "cover", id: null, meta: { hero: "<h1>Acme</h1>", markdown: "Our system." } });
    expect(coverOf(s)).toEqual({ hero: "<h1>Acme</h1>", markdown: "Our system." });
    expect(coverOf({ kind: "text", markdown: "x" })).toBeNull();
  });
});
