/**
 * The chat tile WITH the board's conversation list: the same remount law as the
 * bare chat tile — waking (hide -> show) and remounting read NOTHING, the list
 * included — and the list shows only the board's conversations (no unrestricted
 * read, ever).
 *
 * Break: the list re-reads on wake (its mount effect re-runs), or reads the
 * person's whole library while the board's set is still loading.
 */

jest.mock("@/utils/supabase/client", () => {
  const { createFakeSupabase } = jest.requireActual("./remount-safety/fake-backend");
  const client = createFakeSupabase();
  return { createClient: () => client, supabase: client };
});
jest.mock("next/navigation", () => jest.requireActual("./remount-safety/next-navigation"));
// The board's association edges are the association system's own read; this test is about the tile.
const mockEdges = jest.fn();
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: {
    listForTargets: (...a: unknown[]) => mockEdges(...a),
    // The chat column's context chip reads the conversation's own scopes through this.
    listForEntity: jest.fn().mockResolvedValue({ ok: true, data: { edges: [] } }),
    add: jest.fn().mockResolvedValue({ ok: true, data: { id: "e" } }),
    remove: jest.fn().mockResolvedValue({ ok: true, data: null }),
  },
}));

import { BOARD_ITEM_TYPES } from "../items/catalog";
import { BoardChatsProvider } from "../items/board-chats";
import { expectQuiet, runCycle } from "./remount-safety/harness";
import { installBrowserGaps } from "./remount-safety/browser-gaps";
import { CONVERSATION_ID, seedChat } from "./remount-safety/fixtures-work";
import { backendCalls } from "./remount-safety/fake-backend";

// The conversation list reads only once it is in view (@ai-matrx/kit useInView); the list on screen is in view.
// Only the list reports in view: every other lazy chip keeps the inert observer, as in the bare chat tile's case.
(globalThis as Record<string, unknown>).IntersectionObserver = class {
  constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) {}
  observe(target: Element) {
    if (target.closest("[data-board-chat-list]")) this.callback([{ isIntersecting: true }]);
  }
  unobserve() {}
  disconnect() {}
};
installBrowserGaps();

const BOARD = "9a1c2a9e-4b0f-4c1e-9a55-2f3e8b6d1b01";
const chatType = BOARD_ITEM_TYPES.find((t) => t.key === "chat")!;
const wrap = (children: React.ReactNode) => (
  <BoardChatsProvider boardId={BOARD} organizationId={null}>
    {children}
  </BoardChatsProvider>
);

beforeEach(() => {
  mockEdges.mockReset().mockResolvedValue({ ok: true, data: { edges: [{ sourceType: "conversation", sourceId: CONVERSATION_ID }] } });
});

it("a chat tile beside the board's list wakes and remounts without reading anything", async () => {
  const result = await runCycle(chatType, { kind: "entity", entity: "chat", id: CONVERSATION_ID }, {
    title: "Rent increase notice for Unit 4B",
    prepare: seedChat,
    loadMs: 1000,
    wrap,
    kept: (tile) => ({ list: !!tile.container.querySelector("[data-board-chat-list]"), saved: tile.source() }),
  });
  expect(result.keptAfterWake).toEqual({ list: true, saved: { kind: "entity", entity: "chat", id: CONVERSATION_ID } });
  expectQuiet(result);
});

it("the list's read is limited to the board's conversations", async () => {
  await runCycle(chatType, { kind: "entity", entity: "chat", id: CONVERSATION_ID }, {
    prepare: seedChat,
    loadMs: 1000,
    wrap,
    kept: () => null,
  });
  // The board's `id in (its set)` filter is present, and no list read of conversations is wider than the
  // board: the list also reads the child sessions of the board's chats (`parent_conversation_id in …`),
  // so every read carries the board's id set, its children by `in`, or one chat's children by `eq` — never the exact filter set.
  const listReads = backendCalls().filter(
    (c) => c.target === "chat.conversation" && c.op === "select" && c.filters.some(([name]) => name === "order"),
  );
  expect(listReads.length).toBeGreaterThan(0);
  expect(listReads.some((read) => read.filters.some((f) => JSON.stringify(f) === JSON.stringify(["in", ["id", [CONVERSATION_ID]]])))).toBe(true);
  for (const read of listReads) {
    const limited = read.filters.some(
      (f) =>
        (f[0] === "in" && Array.isArray(f[1]) && (f[1][0] === "id" || f[1][0] === "parent_conversation_id") && JSON.stringify(f[1][1]) === JSON.stringify([CONVERSATION_ID])) ||
        (f[0] === "eq" && Array.isArray(f[1]) && f[1][0] === "parent_conversation_id" && f[1][1] === CONVERSATION_ID),
    );
    expect(limited).toBe(true);
  }
});
