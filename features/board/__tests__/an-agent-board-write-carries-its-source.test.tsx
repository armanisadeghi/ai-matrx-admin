// Q-01 (UI net 2026-10-22, defect 94): an agent that was only ASKED a question replaced a person's Oakland tile
// ($2,945) with an invented rate via board_update_tile, and board_add_tile made a tile titled `Bay 1?` with text `...`.
// The law: an agent never writes a value onto a person's board without a source, and never silently overwrites
// what the person wrote. SUT: the board's write tools (`tools/useBoardAgentTools.ts`, vocabulary in
// `tools/board-tools.ts`, rule in `tools/agent-write-provenance.ts`).
// Breaks it catches: a content write that lands with no `source`; a source of "none"/"guess"; a person's tile
// replaced with no visible, undoable notice; the `source` param missing from the tool vocabulary.

jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "@/lib/toast";
import { executeSurfaceClientTool } from "@ai-matrx/chat/surfaces/runtime/surface-client-tools";
import { BoardStore } from "../board/board-store";
import { BoardSurface } from "../components/BoardSurface";
import { BoardCameraStore } from "../engine/camera-store";
import { BOARD_CLIENT_TOOLS } from "../tools/board-tools";
import type { BoardToolHost } from "../tools/useBoardAgentTools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Tile = { id: string; title: string; text?: string; rect: { x: number; y: number; w: number; h: number } };

function mount() {
  const board = new BoardStore<Tile>([
    { id: "note:oakland", title: "Oakland", text: "Linehaul rate: $2,945", rect: { x: 0, y: 0, w: 400, h: 300 } },
  ]);
  const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
  const host: BoardToolHost<Tile> = {
    board,
    store,
    boardTitle: "Plans",
    createTile: (id, input, size) => ({ id, title: input.title ?? "Write-up", text: input.text, rect: { x: 0, y: 0, ...size } }),
    editTile: (tile, edit) => ({ text: edit.text ?? tile.text }),
    describe: () => ({ kind: "note" }),
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<BoardSurface host={host}>{null}</BoardSurface>));
  return { board, unmount: () => act(() => root.unmount()) };
}
const out = (r: unknown) => (r as { output: Record<string, unknown> }).output;

describe("an agent's board write carries its source", () => {
  it("offers a `source` on both content-writing tools", () => {
    for (const name of ["board_add_tile", "board_update_tile"]) {
      const tool = BOARD_CLIENT_TOOLS.find((t) => t.name === name)!;
      expect(Object.keys((tool.inputSchema as { properties: Record<string, unknown> }).properties)).toContain("source");
    }
  });

  it("board_update_tile with no source never overwrites the person's tile", async () => {
    const { board, unmount } = mount();
    const r = out(await executeSurfaceClientTool("board_update_tile", { id: "note:oakland", text: "Linehaul rate: $15 per mile" }));
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/source/i);
    expect(board.getTile("note:oakland")?.text).toBe("Linehaul rate: $2,945");
    unmount();
  });

  it("a source that says nothing ('none', 'guess') counts as no source", async () => {
    const { board, unmount } = mount();
    for (const source of ["none", "my guess", "   "]) {
      const r = out(await executeSurfaceClientTool("board_update_tile", { id: "note:oakland", text: "x", source }));
      expect(r.ok).toBe(false);
    }
    expect(board.getTile("note:oakland")?.text).toBe("Linehaul rate: $2,945");
    unmount();
  });

  it("board_add_tile with content and no source adds nothing", async () => {
    const { board, unmount } = mount();
    const r = out(await executeSurfaceClientTool("board_add_tile", { kind: "markdown", title: "Bay 1?", text: "..." }));
    expect(r.ok).toBe(false);
    expect(board.read().tiles).toHaveLength(1);
    unmount();
  });

  it("with a named source the write lands, the result echoes it, and the person gets an Undo notice", async () => {
    const { board, unmount } = mount();
    const source = "the person's message: 'set the Oakland linehaul rate to $3,100'";
    const r = out(await executeSurfaceClientTool("board_update_tile", { id: "note:oakland", text: "Linehaul rate: $3,100", source }));
    expect(r.ok).toBe(true);
    expect(r.source).toBe(source);
    expect(board.getTile("note:oakland")?.text).toBe("Linehaul rate: $3,100");
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("Oakland"), expect.objectContaining({ action: expect.objectContaining({ label: "Undo" }) }));
    const added = out(await executeSurfaceClientTool("board_add_tile", { kind: "markdown", title: "Bay 1", text: "Open 6am", source }));
    expect(added.ok).toBe(true);
    unmount();
  });

  it("a title-only change needs no source (no value is written)", async () => {
    const { board, unmount } = mount();
    const r = out(await executeSurfaceClientTool("board_update_tile", { id: "note:oakland", title: "Oakland yard" }));
    expect(r.ok).toBe(true);
    expect(board.getTile("note:oakland")?.title).toBe("Oakland yard");
    unmount();
  });
});
