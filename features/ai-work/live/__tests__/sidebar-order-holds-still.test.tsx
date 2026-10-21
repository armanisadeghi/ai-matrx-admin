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
import type { SessionMemberRow } from "../service";
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

function Sidebar({ sessions, rooms = [], members = [] }: { sessions: LiveSession[]; rooms?: ConversationSummary[]; members?: SessionMemberRow[] }) {
  return (
    <LiveSidebar
      sessions={sessions}
      members={members}
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
/** The usable Sort of one list (the reserved, invisible twin is not usable and not counted). */
const sortOf = (list: string) =>
  (host.querySelector(`[data-sort-action="${list}"]`) as HTMLButtonElement | null) ?? null;
const usable = (b: HTMLButtonElement | null) => (b && !b.disabled && b.getAttribute("aria-hidden") !== "true" ? b : null);
const sortButton = () => usable(sortOf("Sessions"));

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
    expect(usable(sortOf("Rooms"))).not.toBeNull();
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

/**
 * 2026-10-21 review of the order-holding change: Ended, Review rooms and Manager agents held
 * order with no Sort; Sort's arrival shifted the header; what it sorts by lived in a tooltip;
 * a new room could be inserted below "Show more" where nobody sees it.
 */
describe("every held list has the same Sort, and arrivals are never hidden", () => {
  const ended = (n: number, s: number) => ({ ...session(n, s), presence: "ended" as const, status: "ended" });
  const review = (n: number, s: number) =>
    ({ ...room(n, s), conversation: { id: `review-${n}`, metadata: { kind: "agent_review" } }, displayName: `Review ${n}` }) as unknown as ConversationSummary;
  const agent = (n: number) =>
    ({ id: `m-${n}`, member_id: `agent-${n}`, member_kind: "agent_conversation", conversation_id: "room-1" }) as unknown as SessionMemberRow;

  it("Sessions, Ended, Rooms, Review rooms and Manager agents each carry a Sort", () => {
    render(<Sidebar sessions={[session(1, 10), ended(2, 999)]} rooms={[room(1, 10), review(1, 10)]} members={[agent(1)]} />);
    for (const list of ["Sessions", "Ended", "Rooms", "Review rooms", "Manager agents"]) expect(sortOf(list)).not.toBeNull();
  });

  it("Sort's space is reserved (no header shift), it is unfocusable until usable, then a named button announced", () => {
    const { rerender } = render(<Sidebar sessions={[session(1, 10), session(2, 20)]} />);
    const idle = sortOf("Sessions")!;
    expect(idle.className).toContain("invisible");
    expect(idle.getAttribute("tabindex")).toBe("-1");
    expect(idle.getAttribute("aria-hidden")).toBe("true");
    rerender(<Sidebar sessions={[session(1, 90), session(2, 5)]} />);
    const live = sortOf("Sessions")!;
    expect(live).toBe(idle); // the same node: nothing was inserted into the header
    expect(live.className).not.toContain("invisible");
    expect(live.getAttribute("tabindex")).toBeNull();
    expect(live.getAttribute("aria-label")).toBe("Sort Sessions by activity");
    expect(live.textContent).toBe("Sort by activity"); // said on the control, not only in a tooltip
    expect([...host.querySelectorAll('[role="status"]')].some((n) => n.textContent?.includes("Sessions: newer activity"))).toBe(true);
  });

  it("Ended and Review rooms sort when open", () => {
    const { rerender } = render(<Sidebar sessions={[ended(1, 100), ended(2, 200)]} />);
    act(() => buttons().find((b) => b.textContent?.startsWith("Ended"))!.click());
    // The live list now puts Session 2 first (it was seen more recently).
    rerender(<Sidebar sessions={[ended(2, 150), ended(1, 300)]} />);
    expect(sessionOrder()).toEqual(["Session 1", "Session 2"]);
    act(() => usable(sortOf("Ended"))!.click());
    expect(sessionOrder()).toEqual(["Session 2", "Session 1"]);
  });

  it("a new room whose place is below Show more lands inside the visible window", () => {
    const many = Array.from({ length: 14 }, (_, i) => room(i + 1, 10 + i)); // Room 1 newest … Room 14 oldest
    const { rerender } = render(<Sidebar sessions={[]} rooms={many} />);
    expect(roomOrder()).toHaveLength(12);
    // A new room whose live place is 13th (an older last message than the twelve shown).
    const late = { ...room(99, 10 + 12.5), displayName: "Room 99" } as unknown as ConversationSummary;
    rerender(<Sidebar sessions={[]} rooms={[...many.slice(0, 12), late, ...many.slice(12)]} />);
    const shown = buttons().filter((b) => /^Room \d/.test(b.textContent ?? "")).map((b) => b.textContent ?? "");
    expect(shown).toHaveLength(12);
    expect(shown.some((t) => t.startsWith("Room 99"))).toBe(true);
  });
});

describe("holdOrder with a visible window", () => {
  it("a new row below the cut goes in at the last visible slot", () => {
    expect(holdOrder(["a", "b", "c"], ["a", "b", "c", "n"], (s) => s, 2)).toEqual(["a", "n", "b", "c"]);
    expect(holdOrder(["a", "b", "c"], ["n", "a", "b", "c"], (s) => s, 2)).toEqual(["n", "a", "b", "c"]);
  });
});
