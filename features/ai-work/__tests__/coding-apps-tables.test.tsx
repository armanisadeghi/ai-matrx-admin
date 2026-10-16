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
jest.mock("@/lib/python-client", () => ({ getAccessTokenOrNull: async () => null }));
jest.mock("@/features/files/devices/console/useDeviceClient", () => ({ useDeviceClient: () => { throw new Error("not in this test"); } }));
jest.mock("@/features/ai-work/lib/computerChooser", () => ({ listChooserComputers: async () => [] }));

import { AppsTables, type AppsTablesProps } from "@/features/ai-work/components/connections/CodingAppsSection";
import { awayCount, chatCount, compareNext, nextRanks, statusWords, type AppChats } from "@/features/ai-work/lib/codingApps";

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
    computerName: "Test Mac", instances, accounts, chats: new Map([["claude", claudeChats]]), reading: false, readError: null, where: null,
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
    render(<AppsTables {...props()} />);
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
