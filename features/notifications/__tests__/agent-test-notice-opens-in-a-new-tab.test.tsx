/**
 * @jest-environment jsdom
 *
 * The bell notice "Agent test run finished" (event `agent_tests.run_finished`, link
 * `/agents/<id>/test?run=<run>`; the walk of 2026-10-22 saw it move the only tab). Like every
 * notice it opens a NEW TAB through `useOpenNotice` - never the router, never this tab - with the
 * run and organization in the link kept whole.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerCalls: string[] = [];
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: (h: string) => routerCalls.push(h), replace: (h: string) => routerCalls.push(h) }),
}));
const dispatched: unknown[] = [];
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => (action: unknown) => {
    dispatched.push(action);
    return action;
  },
}));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: () => "captured" }));

import { useOpenNotice } from "../openNotice";
import type { InboxNotification } from "../types";

function notice(deep_link: string | null, event_key = "mandate.candidate.pair_finished"): InboxNotification {
  const at = new Date().toISOString();
  return {
    id: "n-1", event_key, event_label: null, bucket: "direct", subject: "x", body: null, deep_link,
    target_kind: null, target_id: null, organization_id: null, organization_name: null,
    actor_id: null, actor_name: null, actor_avatar: null, created_at: at, sort_at: at,
    seen_at: null, read_at: null, done_at: null, snoozed_until: null, acted_at: null, outcome: null,
  };
}

let open: ReturnType<typeof useOpenNotice> | null = null;
function Probe() {
  open = useOpenNotice();
  return null;
}

let container: HTMLDivElement;
let root: Root;
let windowOpen: jest.SpyInstance;
async function mount() {
  windowOpen = jest.spyOn(window, "open").mockImplementation(() => null);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  container = document.createElement("div");
  root = createRoot(container);
  await act(async () => { root.render(<Probe />); });
}

afterEach(() => {
  act(() => root.unmount());
  jest.restoreAllMocks();
});

it("opens the finished-run notice in a new tab and never moves this tab", async () => {
  await mount();
  const link = "/agents/bfdbaade-27ad-4630-b3dd-51226457835c/test?run=b308074a-0000-4000-8000-000000000000&org=226be635-0000-4000-8000-000000000000";
  const lead = notice(link, "agent_tests.run_finished");
  expect(open?.(lead)).toBe("tab");
  expect(windowOpen).toHaveBeenCalledWith(`${window.location.origin}${link}`, "_blank", "noopener");
  expect(routerCalls).toEqual([]);
  expect(window.location.pathname).toBe("/");
});
