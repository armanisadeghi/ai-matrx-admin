import type { RecentChatRow } from "@ai-matrx/coding-sessions";

import { clientLabelFor, inScope, rowFacts, sessionsState, wholeViewRefusal } from "./model";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const MAC_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

const live = { pill: "live" as const, label: "Live", offlineSinceMs: null, detail: null };

function row(over: Partial<RecentChatRow>): RecentChatRow {
  return { target: "#s/a", title: "Parser", provider: "claude", sessionId: "a", providerSessionId: null, cwd: "/Users/a/code/parser", updatedAt: "2026-10-12T10:00:00.000Z", state: "idle", stateLabel: null, pinned: false, startedBy: null, ...over };
}

describe("the Sessions view's rules", () => {
  it("names this browser the way a person would", () => {
    expect(clientLabelFor(IPHONE)).toBe("iPhone");
    expect(clientLabelFor(IPAD)).toBe("iPad");
    expect(clientLabelFor(MAC_SAFARI)).toBe("Safari on Mac");
    expect(clientLabelFor(MAC_CHROME)).toBe("Chrome on Mac");
    expect(clientLabelFor("")).toBe("A browser");
  });

  it("says the one honest state, in order: offline or asleep, refused, connecting, too old, tools off", () => {
    const open = { state: "open" as const };
    expect(sessionsState({ console: { ...live, pill: "offline", label: "Offline" }, transport: open, deviceName: "Arman's Mac", refusal: null })).toMatchObject({ kind: "blocked", title: "Arman's Mac is offline or asleep" });
    expect(sessionsState({ console: { ...live, pill: "refused", label: "Removed", detail: "This computer was removed" }, transport: open, deviceName: "M", refusal: null })).toEqual({ kind: "blocked", title: "Removed", body: "This computer was removed" });
    expect(sessionsState({ console: live, transport: { state: "connecting" }, deviceName: "M", refusal: null })).toMatchObject({ title: "Connecting…" });
    expect(sessionsState({ console: live, transport: { state: "closed", reason: "Update Matrx 2 on M to steer its coding sessions from here." }, deviceName: "M", refusal: null })).toMatchObject({ body: "Update Matrx 2 on M to steer its coding sessions from here." });
    expect(sessionsState({ console: live, transport: open, deviceName: "M", refusal: "coding_sessions_read is turned off for agents on this computer. Turn it on in Agents › Tools on that computer." })).toMatchObject({ title: "Coding sessions are turned off" });
    expect(sessionsState({ console: live, transport: open, deviceName: "M", refusal: null })).toEqual({ kind: "ready" });
  });

  it("only the person's own switch stops the whole view", () => {
    expect(wholeViewRefusal({ code: "AUTH_FORBIDDEN", message: "coding_sessions_read is turned off for agents on this computer. Turn it on in Agents › Tools on that computer." })).toMatch(/turned off/);
    expect(wholeViewRefusal({ code: "NOT_FOUND", message: "This session is not in the list anymore." })).toBeNull();
  });

  it("reads a row with the Mac's words and dots, and who started it", () => {
    expect(rowFacts(row({ state: "running", stateLabel: "Running" }))).toEqual({ title: "Parser", where: "parser · Claude Code", tone: "warning", toneLabel: "Running", from: null });
    expect(rowFacts(row({ state: "new_output", stateLabel: "New output", startedBy: { kind: "phone", label: "iPhone" } }))).toMatchObject({ tone: "info", from: "From iPhone" });
    expect(rowFacts(row({ provider: "codex", cwd: null, startedBy: { kind: "agent", label: "An agent" } }))).toMatchObject({ where: "No folder · Codex", tone: null, from: "From an agent" });
  });

  it("scopes the list like the Mac's smart mailboxes", () => {
    expect(inScope(row({ state: "needs_attention" }), "attention")).toBe(true);
    expect(inScope(row({ state: "elsewhere" }), "open")).toBe(true);
    expect(inScope(row({ state: "idle" }), "open")).toBe(false);
    expect(inScope(row({ pinned: true }), "pinned")).toBe(true);
    expect(inScope(row({}), "all")).toBe(true);
  });
});
