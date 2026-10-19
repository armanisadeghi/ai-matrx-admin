/**
 * THE AGENT MANAGES THE PERSON'S BOARD WITH THEIR REAL RECORDS (Arman, 2026-10-04: "tell the agent
 * that I'm working on a topic and then tell it to get all of my notes, files, chat … about that
 * topic on the board"). `board_add_items` places an existing record exactly as its bring-in picker
 * does, or starts a new one through the type's own create; `board_find_records` turns a topic into
 * candidates keyed by catalog item type. Real BoardStore, real camera store, real tool handlers
 * through BoardSurface, the real catalog, and the exact dedup + placement functions UserBoard's
 * `place()` runs (`planPlacement`, `placeTiles`).
 */

jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
jest.mock("@/features/unified-data/hub/doors", () => ({
  ...jest.requireActual("@/features/unified-data/hub/doors"),
  dataHomeTables: jest.fn(),
}));
jest.mock("@/features/data-tables/pick-lists/pick-list-index", () => ({
  ...jest.requireActual("@/features/data-tables/pick-lists/pick-list-index"),
  readPickListIndex: jest.fn(),
}));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { executeSurfaceClientTool } from "@ai-matrx/chat/surfaces/runtime/surface-client-tools";
import { BoardStore } from "../board/board-store";
import { planPlacement } from "../board/plan-placement";
import { BoardSurface } from "../components/BoardSurface";
import { BoardCameraStore } from "../engine/camera-store";
import { placeTiles } from "../home/place-run";
import { BOARD_ITEM_TYPES, itemTypeFor } from "../items/catalog";
import { startNewEntries, type PlacedItem } from "../items/types";
import type { UserBoardTile } from "../home/UserBoard";
import type { AgentLookup, AgentRow } from "../tools/board-agent-resolve";
import { resolveAgentRef } from "../tools/board-agent-resolve";
import type { BoardToolHost } from "../tools/useBoardAgentTools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOTE = "0b8f5f0e-1f7c-4a43-9a8e-3d1f5a2c7e01";
const TABLE = "5d1c2b7a-90e4-4c11-8f3e-2a6b9c4d8e02";
const TASK = "9e7a3c51-2b4d-4f86-a1c0-7d5e3b9f6a03";


const AGENT_ID = "3b1d7c52-6a0e-4f19-8d24-5c9e1a7b4f01";
const OTHER_ID = "7e2a9d63-1c4b-4a85-9f10-2d6b8c3e5a02";
const row = (id: string, name: string, extra: Partial<AgentRow> = {}): AgentRow => ({ id, name, isActive: true, isArchived: false, ...extra });

/** A catalog stand-in with the real lookup's shape: a loaded list plus a server search that can add rows. */
function lookupOf(rows: AgentRow[], serverRows: AgentRow[] = []): AgentLookup & { searched: string[] } {
  const known = [...rows];
  const searched: string[] = [];
  return {
    searched,
    ensureLoaded: async () => {},
    rows: () => known,
    byId: (id) => known.find((r) => r.id === id),
    searchServer: async (q) => {
      searched.push(q);
      const hits = serverRows.filter((r) => (r.name ?? "").toLowerCase().includes(q.toLowerCase()) || r.id === q);
      for (const h of hits) if (!known.some((k) => k.id === h.id)) known.push(h);
      return hits.map((h) => h.id);
    },
  };
}

let LOOKUP: AgentLookup = lookupOf([row(AGENT_ID, "Flashcard Topic Deck Composer"), row(OTHER_ID, "Brand Voice Checker")]);

function mount(start: UserBoardTile[] = []) {
  const board = new BoardStore<UserBoardTile>(start);
  const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
  store.setSize({ w: 1600, h: 1000 });
  // UserBoard's place(), minus the camera moves: the same two functions.
  const place = (wanted: PlacedItem[], at?: { x: number; y: number }) => {
    const plan = planPlacement(wanted, [...board.read().tiles, ...board.read().parked], itemTypeFor);
    const view = { camera: store.getCamera(), size: store.getSize(), insets: store.getInsets() };
    if (plan.tiles.length > 0) placeTiles(board, plan.tiles, view, null, at);
    return plan.results;
  };
  const host: BoardToolHost<UserBoardTile> = {
    board,
    store,
    boardTitle: "Move-out",
    createTile: () => ({ ok: false, error: "unused" }),
    describe: (t) => ({ kind: itemTypeFor(t.source)?.key ?? "item" }),
    itemTypes: BOARD_ITEM_TYPES,
    agentLookup: LOOKUP,
    placeItems: (batch) => {
      const out = new Array(batch.length).fill(null);
      const flowing = batch.flatMap((b, i) => (b.at ? [] : [i]));
      place(flowing.map((i) => batch[i].item)).forEach((r, k) => (out[flowing[k]] = r));
      batch.forEach((b, i) => {
        if (b.at) out[i] = place([b.item], b.at)[0] ?? null;
      });
      return out;
    },
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<BoardSurface host={host}>{null}</BoardSurface>));
  return { board, unmount: () => act(() => root.unmount()) };
}


type AddOutput = { ok: boolean; added: number; results: { status: string; tile_id?: string; error?: string }[] };
const addItems = async (items: unknown[]) =>
  ((await executeSurfaceClientTool("board_add_items", { items })) as { output: AddOutput }).output;

describe("board_add_items — an agent form for a NAMED agent (FEATURE.md Open #13)", () => {
  beforeEach(() => {
    LOOKUP = lookupOf([row(AGENT_ID, "Flashcard Topic Deck Composer"), row(OTHER_ID, "Brand Voice Checker")]);
  });

  it("agent by name starts an agent-form tile with that agent's id; the layout stays the default", async () => {
    const { board, unmount } = mount();
    const out = await addItems([{ type: "agent-form", agent: "flashcard topic deck composer" }]);
    expect(out.results[0].status).toBe("added");
    const tile = board.getTile(out.results[0].tile_id!)!;
    expect(tile.source).toEqual({ kind: "entity", entity: "agent-form", id: null, meta: { agentId: AGENT_ID } });
    expect(tile.title).toBe("Flashcard Topic Deck Composer");
    unmount();
  });

  it("agent by id works, and a chat can be started with an agent the same way", async () => {
    const { board, unmount } = mount();
    const out = await addItems([{ type: "agent-form", agent: OTHER_ID }, { type: "chat", agent: "Brand Voice Checker" }]);
    expect(out.results.map((r) => r.status)).toEqual(["added", "added"]);
    expect(board.getTile(out.results[1].tile_id!)?.source).toEqual({ kind: "entity", entity: "chat", id: null, meta: { agentId: OTHER_ID } });
    unmount();
  });

  it("an unknown or ambiguous agent is refused with why, and nothing is placed for it", async () => {
    LOOKUP = lookupOf([row(AGENT_ID, "Summarizer", { organizationName: "Acme" }), row(OTHER_ID, "Summarizer", { organizationName: "Beta" })]);
    const { board, unmount } = mount();
    const out = await addItems([{ type: "agent-form", agent: "Summarizer" }, { type: "agent-form", agent: "No Such Agent" }]);
    expect(out.results.map((r) => r.status)).toEqual(["refused", "refused"]);
    expect(out.results[0].error).toContain("2 agents are named");
    expect(out.results[0].error).toContain(AGENT_ID);
    expect(out.results[1].error).toContain("No agent named");
    expect(board.read().tiles).toHaveLength(0);
    unmount();
  });

  it("agent on a type with no agent to choose, or together with an id, is refused", async () => {
    const { unmount } = mount();
    const out = await addItems([{ type: "note", agent: "Brand Voice Checker" }, { type: "agent-form", id: "c1", agent: "Brand Voice Checker" }]);
    expect(out.results.map((r) => r.status)).toEqual(["refused", "refused"]);
    unmount();
  });
});

describe("resolveAgentRef — one real agent from the catalog, or why not", () => {
  it("asks the server when the loaded list lacks the name; archived agents never match", async () => {
    const lookup = lookupOf([row(OTHER_ID, "Old Thing", { isArchived: true })], [row(AGENT_ID, "Deck Composer")]);
    const found = await resolveAgentRef("Deck Composer", lookup);
    expect(found).toEqual({ ok: true, id: AGENT_ID, name: "Deck Composer" });
    expect(lookup.searched).toEqual(["Deck Composer"]);
    const archived = await resolveAgentRef("Old Thing", lookup);
    expect(archived.ok).toBe(false);
  });
});
