/**
 * @jest-environment jsdom
 *
 * Arman, 2026-10-21, on /work/live: "the chats constantly flash and change
 * position nearly every second ... a sort that is based on activity ... needs
 * to be stable". Every heartbeat bumped `last_seen_at`, and the sidebar
 * re-sorted by it on every render, so rows swapped places each second.
 *
 * The rule proven here: live updates change a row in place; its position
 * changes only when the tab comes back, the filter changes, or the person
 * presses Sort. Rows are the same DOM nodes throughout (no remount).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ConversationSummary } from "@ai-matrx/messaging";
import { holdOrder } from "@/hooks/useStableOrder";
import type { LiveSession } from "../useLiveHub";
import { LiveSidebar } from "../components/LiveSidebar";

// The row's right-click menu needs the Redux store; it only wraps the row.
jest.mock("../components/LiveRowMenu", () => ({
  LiveRowMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const NOW = Date.parse("2026-10-21T12:00:00Z");
const ago = (s: number) => new Date(NOW - s * 1000).toISOString();

function session(n: number, seenSecondsAgo: number, presence: "busy" | "idle" = "idle"): LiveSession {
  return {
    id: `id-${n}`,
    address: `addr-${n}`,
    provider: "claude_code",
    providerLabel: "Claude Code",
    title: `Session ${n}`,
    workspace: null,
    account: null,
    status: presence,
    lastSeenAt: ago(seenSecondsAgo),
    presence,
    subagents: 0,
    bindingIds: [`id-${n}`],
    remote: false,
  };
}

function room(n: number, lastSecondsAgo: number): ConversationSummary {
  return {
    conversation: { id: `room-${n}`, metadata: { kind: "agent_room" } },
    displayName: `Room ${n}`,
    unreadCount: 0,
    lastMessageAt: ago(lastSecondsAgo),
    lastMessageContent: `hello ${n}`,
  } as unknown as ConversationSummary;
}

function Sidebar({ sessions, rooms = [] }: { sessions: LiveSession[]; rooms?: ConversationSummary[] }) {
  return (
    <LiveSidebar
      sessions={sessions}
      members={[]}
      agentInfo={{}}
      rooms={rooms}
      selection={null}
      nowMs={NOW}
      loaded
      roomsComplete
      error={null}
      onRetry={() => {}}
      onSelect={() => {}}
      onNewRoom={() => {}}
    />
  );
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function render(ui: React.ReactElement) {
  act(() => root.render(ui));
  return { rerender: (next: React.ReactElement) => act(() => root.render(next)) };
}
const buttons = () => [...host.querySelectorAll("button")];
const sortButton = () => buttons().find((b) => b.textContent === "Sort") ?? null;

const sessionRows = () =>
  buttons().filter((b) => /^Session \d/.test(b.textContent ?? ""));
const sessionOrder = () => sessionRows().map((b) => b.textContent?.match(/^Session \d/)?.[0]);
const roomOrder = () =>
  buttons().filter((b) => /^Room \d/.test(b.textContent ?? "")).map((b) => b.textContent?.slice(0, 6));

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("the Live sidebar holds its order while the person looks", () => {
  it("a burst of presence heartbeats changes no row's position and remounts no row", () => {
    const base = [session(1, 10), session(2, 20), session(3, 30), session(4, 40)];
    const { rerender } = render(<Sidebar sessions={base} />);
    const first = sessionOrder();
    const nodes = sessionRows();
    expect(first).toEqual(["Session 1", "Session 2", "Session 3", "Session 4"]);

    // Twenty heartbeats, each making a different session the most recent,
    // some flipping busy/idle: the live sort would reshuffle on every one.
    for (let beat = 0; beat < 20; beat++) {
      const fresh = base.map((s, i) => session(i + 1, (i + beat) % 4 === 0 ? 1 : 50 + i, beat % 3 === i % 3 ? "busy" : "idle"));
      rerender(<Sidebar sessions={fresh} />);
      expect(sessionOrder()).toEqual(first);
    }
    // Same DOM nodes: content updated in place, nothing remounted.
    sessionRows().forEach((node, i) => expect(node).toBe(nodes[i]));
  });

  it("offers Sort while out of order, and Sort adopts the live order", () => {
    const { rerender } = render(<Sidebar sessions={[session(1, 10), session(2, 20)]} />);
    expect(sortButton()).toBeNull();
    rerender(<Sidebar sessions={[session(1, 90), session(2, 5)]} />);
    expect(sessionOrder()).toEqual(["Session 1", "Session 2"]);
    act(() => sortButton()!.click());
    expect(sessionOrder()).toEqual(["Session 2", "Session 1"]);
    expect(sortButton()).toBeNull();
  });

  it("re-sorts when the tab comes back after being hidden", () => {
    const { rerender } = render(<Sidebar sessions={[session(1, 10), session(2, 20)]} />);
    rerender(<Sidebar sessions={[session(1, 90), session(2, 5)]} />);
    expect(sessionOrder()).toEqual(["Session 1", "Session 2"]);
    act(() => setVisibility("hidden"));
    expect(sessionOrder()).toEqual(["Session 1", "Session 2"]);
    act(() => setVisibility("visible"));
    expect(sessionOrder()).toEqual(["Session 2", "Session 1"]);
  });

  it("a new message does not move a room; a genuinely new room goes in at its place", () => {
    const { rerender } = render(<Sidebar sessions={[]} rooms={[room(1, 10), room(2, 20), room(3, 30)]} />);
    expect(roomOrder()).toEqual(["Room 1", "Room 2", "Room 3"]);
    // Room 3 gets a message: the server list now has it first.
    rerender(<Sidebar sessions={[]} rooms={[room(3, 1), room(1, 10), room(2, 20)]} />);
    expect(roomOrder()).toEqual(["Room 1", "Room 2", "Room 3"]);
    rerender(<Sidebar sessions={[]} rooms={[room(4, 0), room(3, 1), room(1, 10), room(2, 20)]} />);
    expect(roomOrder()).toEqual(["Room 4", "Room 1", "Room 2", "Room 3"]);
    expect(sortButton()).not.toBeNull();
  });
});

describe("holdOrder", () => {
  const key = (s: string) => s;
  it("keeps held rows in place, drops gone rows, inserts new rows at their live index", () => {
    expect(holdOrder(["a", "b", "c"], ["c", "b", "a"], key)).toEqual(["a", "b", "c"]);
    expect(holdOrder(["a", "b", "c"], ["c", "a"], key)).toEqual(["a", "c"]);
    expect(holdOrder(["a", "b"], ["n", "b", "a"], key)).toEqual(["n", "a", "b"]);
  });
});
