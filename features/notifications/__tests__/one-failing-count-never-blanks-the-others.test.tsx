/**
 * ONE READ MUST NOT FAIL ALL FOUR. `platform.shell_counts` answers each section on its own; a
 * section that came back null falls back to ITS OWN old read and nothing else. Red on the reader
 * that marked the bell partial for any shell failure and read no fallback.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseShellCounts, shellSectionFailed } from "@/lib/boot/shellCounts";

const rpcCalls: string[] = [];
let shellAnswer: { data: unknown; error: unknown } = { data: null, error: null };
jest.mock("../useInboxMemory", () => ({
  useInboxMemory: () => ({
    ready: true,
    seen: { counts: {}, ids: {} },
    cleared: { counts: {}, ids: {} },
    hiddenSources: [],
    saveSeen: () => undefined,
    saveCleared: () => undefined,
    saveHidden: () => undefined,
  }),
}));
jest.mock("@/features/approvals/usePendingApprovalCount", () => ({
  usePendingApprovalCount: () => ({ count: 0, unknown: false, storeCount: 0 }),
}));
jest.mock("@ai-matrx/kit/idle-scheduler", () => ({ useIdleReady: () => true }));
jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => true }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1", useAppDispatch: () => () => undefined }));
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({
      rpc: async (name: string) => {
        rpcCalls.push(name);
        if (name === "shell_counts") return shellAnswer;
        if (name === "my_inbox_summary") {
          return { data: [{ unseen_needs_you: 0, unseen_direct: 4, unseen_updates: 0, unread: 4, inbox: 4, snoozed: 0, done: 0 }], error: null };
        }
        if (name === "inbox_counts") return { data: [{ organization_id: "o1", organization_name: "Cedar", waiting: 6, snoozed: 0, overdue: 0 }], error: null };
        return { data: null, error: { code: "PGRST202", message: "absent" } };
      },
    }),
  }),
}));

import { useInboxCounts, type InboxCounts } from "../useInbox";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let latest: InboxCounts | null = null;
function Probe() {
  latest = useInboxCounts();
  return null;
}

const INBOX = { unseen_needs_you: 1, unseen_direct: 2, unseen_updates: 0, unread: 3, inbox: 3, snoozed: 0, done: 0 };

async function mount() {
  rpcCalls.length = 0;
  latest = null;
  const host = document.createElement("div");
  const root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  for (let i = 0; i < 50; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }
  return () => act(() => root.unmount());
}

it("parse: a null section stays null (never zero), the rest parse", () => {
  const c = parseShellCounts({ inbox: INBOX, work: null, assists: null, needs_you: 7, kg_pending: 0, errors: { work: "x" } });
  expect(c.work).toBeNull();
  expect(c.assists).toBeNull();
  expect(c.needsYou).toBe(7);
  expect(c.inbox?.unseenDirect).toBe(2);
  expect(shellSectionFailed({ data: c, isError: false }, "work")).toBe(true);
  expect(shellSectionFailed({ data: c, isError: false }, "needsYou")).toBe(false);
  expect(shellSectionFailed({ data: undefined, isError: false }, "work")).toBe(false);
  expect(shellSectionFailed({ data: undefined, isError: true }, "work")).toBe(true);
});

it("work failing alone: the inbox section still comes from the shell read; only inbox_counts is re-read", async () => {
  shellAnswer = { data: { inbox: INBOX, work: null, assists: 0, needs_you: 0, kg_pending: 0, errors: { work: "boom" } }, error: null };
  const unmount = await mount();
  expect(latest?.summary?.unseenDirect).toBe(2);
  expect(latest?.work).toBe(6);
  expect(latest?.partial).toBe(false);
  expect(rpcCalls).toContain("inbox_counts");
  expect(rpcCalls).not.toContain("my_inbox_summary");
  unmount();
});

it("an unrelated section (assists) failing is not a partial bell and re-reads nothing for the bell", async () => {
  shellAnswer = { data: { inbox: INBOX, work: [], assists: null, needs_you: null, kg_pending: null, errors: { assists: "boom" } }, error: null };
  const unmount = await mount();
  expect(latest?.partial).toBe(false);
  expect(latest?.work).toBe(0);
  expect(rpcCalls).not.toContain("inbox_counts");
  expect(rpcCalls).not.toContain("my_inbox_summary");
  unmount();
});

it("the whole read failing: each part falls back to its own old read and the bell is still whole", async () => {
  shellAnswer = { data: null, error: { code: "XX000", message: "down" } };
  const unmount = await mount();
  expect(latest?.summary?.unseenDirect).toBe(4);
  expect(latest?.work).toBe(6);
  expect(latest?.partial).toBe(false);
  unmount();
});
