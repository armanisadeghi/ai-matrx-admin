// Q-22 (UI net 2026-10-22, defect 89): the agent asked for `board_add_tile { kind: "text", title: "Crew start",
// text: "Thursday" }` and the board kept "Thursday" but silently dropped the title — plain text is a canvas object
// with no title field. A title the agent names must land: a text request WITH a title becomes a titled tile that
// holds the words. Plain text with no title still lands on the canvas itself.

jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { executeSurfaceClientTool } from "@ai-matrx/chat/surfaces/runtime/surface-client-tools";
import { BoardStore } from "../board/board-store";
import { BoardSurface } from "../components/BoardSurface";
import { BoardCameraStore } from "../engine/camera-store";
import type { BoardToolHost } from "../tools/useBoardAgentTools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Tile = { id: string; title: string; text?: string; rect: { x: number; y: number; w: number; h: number } };

function mount() {
  const board = new BoardStore<Tile>([]);
  const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
  const host: BoardToolHost<Tile> = {
    board,
    store,
    boardTitle: "Plans",
    // Mirrors UserBoard's agentTile: a plain "text" tile is refused there (canvas object), a markdown tile is titled.
    createTile: (id, input, size) =>
      input.kind === "text"
        ? { ok: false, error: "Plain text is placed on the canvas itself." }
        : { id, title: input.title ?? "Write-up", text: input.text, rect: { x: 0, y: 0, ...size } },
    describe: () => ({ kind: "note" }),
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<BoardSurface host={host}>{null}</BoardSurface>));
  return { board, unmount: () => act(() => root.unmount()) };
}

describe("board_add_tile — a named title is never dropped", () => {
  it("text with a title lands as a tile carrying that title and the words", async () => {
    const { board, unmount } = mount();
    const result = await executeSurfaceClientTool("board_add_tile", { kind: "text", title: "Crew start", text: "Thursday" });
    const out = (result as { output: { ok: boolean; id: string } }).output;
    expect(out.ok).toBe(true);
    const made = board.getTile(out.id);
    expect(made?.title).toBe("Crew start");
    expect(made?.text).toBe("Thursday");
    unmount();
  });
});
