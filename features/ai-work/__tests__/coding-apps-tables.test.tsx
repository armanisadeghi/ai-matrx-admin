/** @jest-environment jsdom */

/**
 * /work/connections › Coding apps — the Instances and Accounts tables show Matrx 2's columns, in
 * its order, and the desktop's rules (Next order, chats in / moved away from an instance). The
 * rows are shaped exactly as `apps.instances.list` / `apps.accounts.list` answer; only the wire
 * (relay, sign-in) is stubbed — the tables are the real canonical table.
 */

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AppAccount, AppInstance, ChatRow } from "@ai-matrx/desktop-protocol";

import { TooltipProvider } from "@/components/ui/tooltip";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/lib/python-client", () => ({ getAccessTokenOrNull: async () => null, resolveBaseUrl: () => "https://server.test/" }));
jest.mock("@/features/files/devices/console/useDeviceClient", () => ({ useDeviceClient: () => { throw new Error("not in this test"); } }));
jest.mock("@/features/ai-work/lib/computerChooser", () => ({ listChooserComputers: async () => [] }));

import { AppsTables, type AppsTablesProps } from "@/features/ai-work/components/connections/CodingAppsSection";
import type { ClaudeCloudDelivery } from "@/features/ai-work/components/connections/ClaudeCloudDelivery";
import { awayCount, chatCount, compareNext, nextGroup, nextRanks, statusWords, type AppChats } from "@/features/ai-work/lib/codingApps";

const NOW = Date.now();
const H = 3_600_000;

function instance(over: Partial<AppInstance>): AppInstance {
  return {
    app_key: "claude", key: "main", main: true, status: "open", running: true, pid: 100, folder: "/Users/x/Library/Application Support/Claude",
    folder_exists: true, account_id: "acct-a", account: "a@example.com", meant_for: null, version: "2.37337.1", installed_version: "2.37337.1",
    open_chats: 2, launched_ms: NOW - 2 * H, quit_ms: null, first_launch_ms: NOW - 90 * 24 * H, ...over,
  } as AppInstance;
}
function account(over: Partial<AppAccount>): AppAccount {
  return {
    app_key: "claude", account_id: "acct-a", email: "a@example.com", plan: "max", orgs: [], weekly: 40, weekly_reset_since: false,
    weekly_resets_at_ms: NOW + 30 * H, weekly_reset_source: "app", five_hour: 10, five_hour_reset_since: false, five_hour_resets_at_ms: NOW + 2 * H,
    extra_usage: null, credits: null, read_at_ms: NOW - 5 * 60_000, read_in: "main", instances: ["main"], first_seen_ms: NOW - 30 * 24 * H,
    last_seen_ms: NOW, missing: [], ...over,
  } as AppAccount;
}
const chat = (id: string, places: string[], projects: string[] = []) =>
  ({ id, places, projects, hidden_in: [], running: [] }) as unknown as ChatRow;

const instances = [
  instance({}),
  instance({ key: "sales", main: false, status: "closed", running: false, pid: null, account_id: "acct-b", account: "b@example.com", open_chats: 0, version: "2.31226.1" }),
];
const accounts = [
  account({}),
  account({ account_id: "acct-b", email: "b@example.com", weekly: 20, weekly_resets_at_ms: NOW + 5 * H, instances: ["sales"] }),
  account({ account_id: "acct-c", email: "c@example.com", weekly: 97, instances: [] }),
];
const claudeChats: AppChats = {
  windows: [{ key: "main", main: true }, { key: "sales", main: false }],
  projects: [{ id: "p1", name: "From sales", archived: false }],
  chats: [chat("1", ["main"]), chat("2", ["main"], ["p1"]), chat("3", ["sales"]), chat("4", ["sales"])],
};

function props(over: Partial<AppsTablesProps> = {}): AppsTablesProps {
  return {
    computerName: "Test Mac", instances, accounts, chats: new Map([["claude", claudeChats]]), readingInstances: false, readingAccounts: false, instancesError: null, accountsError: null, where: null,
    problem: null, asOfMs: NOW - 60_000, refreshing: false, client: null, action: null, onRefresh: null, onDone: () => undefined, picker: null, ...over,
  };
}

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
const render = (node: ReactNode) => act(() => root.render(<TooltipProvider>{node}</TooltipProvider>));
const headers = (table: Element) => [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim()).filter((t) => t && t !== "Actions");
const tables = () => [...host.querySelectorAll("table")];

describe("Coding apps tables — the same as Matrx 2's Code › Desktop apps", () => {
  it("Instances and Accounts carry the desktop's columns, in its order (All apps)", () => {
    const codex = account({ app_key: "codex", account_id: "cx-1", email: "x@example.com", credits: 12.5, instances: [] });
    render(<AppsTables {...props({ accounts: [...accounts, codex] })} />);
    const [inst, acct] = tables();
    expect(headers(inst!)).toEqual(["App", "Instance", "Status", "Account", "Version", "Weekly", "Chats", "Open", "Away", "Launched"]);
    expect(headers(acct!)).toEqual(["Next", "App", "Account", "Weekly", "Week resets", "5-hour", "5-hour resets", "Extra", "Credits", "Read", "Instances"]);
  });

  it("every row action is there and dimmed, not hidden, when no computer is connected", () => {
    render(<AppsTables {...props()} />);
    const buttons = [...host.querySelectorAll("button")].filter((b) => /^(Open|Restart|Read usage) \(No computer is connected\)$/.test(b.getAttribute("aria-label") ?? ""));
    expect(buttons.length).toBe(2 * 3 + 3 * 2);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect([...host.querySelectorAll("button")].some((b) => (b.getAttribute("aria-label") ?? "").startsWith("Everything about sales"))).toBe(true);
  });

  it("an app that keeps no usage shows no usage columns on its own tab", () => {
    const cursor = [account({ app_key: "cursor", account_id: "cur-1", email: "c@example.com", weekly: null, five_hour: null, read_at_ms: null, weekly_resets_at_ms: null, five_hour_resets_at_ms: null })];
    render(<AppsTables {...props({ accounts: [...accounts, ...cursor] })} />);
    const cursorTab = [...host.querySelectorAll("button, [role=tab], [role=radio]")].find((b) => b.textContent?.startsWith("Cursor"));
    act(() => (cursorTab as HTMLElement).click());
    const [, acct] = tables();
    expect(headers(acct!)).toEqual(["Next", "Account", "Instances"]);
  });

  it("Accounts says it is still reading, never 'No accounts seen yet', while its read is in flight", () => {
    render(<AppsTables {...props({ accounts: [], readingAccounts: true })} />);
    expect(host.textContent).not.toContain("No accounts seen yet");
  });

  it("no computer: an honest empty state, never a false 'no apps'", () => {
    render(<AppsTables {...props({ instances: [], accounts: [], chats: new Map(), computerName: null, where: "None of your 3 computers is online" })} />);
    expect(host.textContent).toContain("None of your 3 computers is online");
    expect(host.textContent).toContain("No computer connected");
  });
});

describe("the desktop's rules, mirrored", () => {
  it("Next: available accounts first, the week that resets soonest leading; a limit account is last", () => {
    const sorted = [...accounts].sort(compareNext).map((a) => a.email);
    expect(sorted).toEqual(["b@example.com", "a@example.com", "c@example.com"]);
    const ranks = nextRanks(accounts);
    expect(ranks.get("claude:acct-b")).toBe(1);
    expect(ranks.get("claude:acct-a")).toBe(2);
    expect(ranks.has("claude:acct-c")).toBe(false);
    expect(accounts.map(nextGroup)).toEqual(["Available", "Available", "At the limit"]);
    expect(nextGroup(account({ weekly: 75 }))).toBe("Running low");
  });

  it("Chats and Away count the instance's own chats and the ones moved off it", () => {
    expect(chatCount(claudeChats, "main")).toBe(2);
    expect(chatCount(claudeChats, "sales")).toBe(2);
    expect(awayCount(claudeChats, "sales")).toBe(1);
    expect(chatCount(undefined, "main")).toBe(-1);
  });

  it("an instance added but never opened is 'Not opened yet', not 'Folder missing'", () => {
    expect(statusWords({ status: "folder_missing", first_launch_ms: null, running: false }).word).toBe("Not opened yet");
    expect(statusWords({ status: "folder_missing", first_launch_ms: 1, running: false }).word).toBe("Folder missing");
  });
});

/**
 * FORCING GUARD — Arman, 2026-10-21: "I can see 10+ of my Claude accounts … isn't the system smart
 * enough to know that these are the same account?" Cloud delivery is drawn ON the Claude account
 * rows the computer already lists (matched by email), with a per-row action; a cloud account the
 * computer has not seen still gets a row. There is no second, disconnected list.
 */
describe("Claude cloud delivery on the account rows", () => {
  function cloud(over: Partial<ClaudeCloudDelivery> = {}): ClaudeCloudDelivery {
    return {
      rows: [
        { id: "c1", label: "A@Example.com", email: "A@Example.com", status: "connected", slot: "primary" },
        { id: "c9", label: "far@example.com", email: "far@example.com", status: "connected", slot: "x1acct" },
      ],
      loadError: null, reload: jest.fn(), running: null, resuming: false, failure: null, capacity: null, note: null, signingOut: null,
      start: jest.fn(), finish: jest.fn(), cancel: jest.fn(), signOut: jest.fn(), dismiss: jest.fn(), retryAfterStop: jest.fn(),
      ...over,
    };
  }
  const acctTable = () => tables()[1]!;
  const rowOf = (email: string) => [...acctTable().querySelectorAll("tbody tr")].find((tr) => tr.textContent?.includes(email));

  it("each Claude row says whether its cloud sessions get messages; the unseen cloud account gets its own row", () => {
    render(<AppsTables {...props({ cloud: cloud() })} />);
    expect(headers(acctTable())).toContain("Cloud sessions");
    expect(rowOf("a@example.com")?.textContent).toContain("Ready");
    expect(rowOf("b@example.com")?.textContent).toContain("Needs one sign-in");
    expect(rowOf("far@example.com")?.textContent).toContain("Ready");
    // One concept, one place: no separate "Claude cloud accounts" table.
    expect(tables()).toHaveLength(2);
  });

  it("the row's cloud action starts the sign-in FOR that account; a ready account's action is dimmed", () => {
    const c = cloud();
    render(<AppsTables {...props({ cloud: c })} />);
    const action = (email: string) =>
      [...(rowOf(email)?.querySelectorAll("button") ?? [])].find((b) => (b.getAttribute("aria-label") ?? "").includes("cloud sessions"))!;
    expect(action("b@example.com").disabled).toBe(false);
    act(() => action("b@example.com").click());
    expect(c.start).toHaveBeenCalledWith("b@example.com");
    expect(action("a@example.com").disabled).toBe(true);
  });

  const cloudAction = (tr: Element | undefined) =>
    [...(tr?.querySelectorAll("button") ?? [])].find((b) => (b.getAttribute("aria-label") ?? "").includes("cloud sessions"))!;

  it("an account with no email says so, never 'Needs one sign-in' over a dimmed action", () => {
    const accts = [...accounts, account({ account_id: "acct-noemail", email: null, instances: [] })];
    render(<AppsTables {...props({ accounts: accts, cloud: cloud() })} />);
    const tr = rowOf("Unknown");
    expect(tr?.textContent).toContain("Email not known");
    expect(tr?.textContent).not.toContain("Needs one sign-in");
    const btn = cloudAction(tr);
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-label")).toContain("fills in the next time this account signs in");
  });

  it("two rows with one email are marked as one shared sign-in with a single action", () => {
    const c = cloud({ rows: [] });
    const accts = [
      account({}),
      account({ account_id: "acct-a2", email: "a@example.com", instances: ["work"] }),
    ];
    render(<AppsTables {...props({ accounts: accts, cloud: c })} />);
    const rows = [...acctTable().querySelectorAll("tbody tr")].filter((tr) => tr.textContent?.includes("a@example.com"));
    expect(rows).toHaveLength(2);
    for (const tr of rows) expect(tr.querySelector("[data-cloud-shared]")?.textContent).toContain("Shared sign-in");
    const [first, second] = rows.map(cloudAction);
    expect(first.disabled).toBe(false);
    expect(second.disabled).toBe(true);
    expect(second.getAttribute("aria-label")).toContain("Same Claude sign-in as a@example.com (main)");
  });

  it("a running sign-in is shown on its own row and names the account, step and time", () => {
    const c = cloud({ running: { forEmail: "b@example.com", slot: "s", startedAt: Date.now() - 65_000, step: "starting", phase: "app", phaseDetail: null, link: null } });
    render(<AppsTables {...props({ cloud: c })} />);
    expect(rowOf("b@example.com")?.textContent).toContain("Signing in");
    const panel = host.querySelector("[data-cloud-sign-in=starting]")!;
    expect(panel.textContent).toContain("Connecting b@example.com for cloud sessions");
    expect(panel.textContent).toContain("Step 2 of 3");
    expect(panel.textContent).toContain("up to about 4 minutes");
  });
});

