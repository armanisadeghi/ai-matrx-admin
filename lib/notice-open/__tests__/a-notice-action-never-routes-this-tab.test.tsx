/**
 * @jest-environment jsdom
 *
 * A NOTIFICATION NEVER MOVES THE PAGE — the router half. Whatever a toast's
 * action or a press inside a notice surface asks the router to do, a move to
 * another page opens a new tab and this page stays. The same router outside a
 * notification is untouched.
 */
import React, { act, useContext } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSonner = jest.fn();
jest.mock("sonner", () => ({ toast: Object.assign(mockSonner, { success: mockSonner }) }));

import NoticeRouterGuard from "../NoticeRouterGuard";
import { markNoticeClick, runAsNoticeAction } from "../noticeActivation";
import { toast } from "@/lib/toast";

const moves: string[] = [];
const opened: string[] = [];
const nextRouter = {
  push: (href: string) => moves.push(`push ${href}`),
  replace: (href: string) => moves.push(`replace ${href}`),
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  hmrRefresh: () => undefined,
  prefetch: () => undefined,
} as unknown as AppRouterInstance;

let router: AppRouterInstance | null = null;
function capture(next: AppRouterInstance | null) {
  router = next;
}
function Probe() {
  capture(useContext(AppRouterContext));
  return null;
}

beforeAll(async () => {
  window.open = ((url?: string | URL) => {
    opened.push(String(url));
    return null;
  }) as typeof window.open;
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(
      <AppRouterContext.Provider value={nextRouter}>
        <NoticeRouterGuard>
          <Probe />
        </NoticeRouterGuard>
      </AppRouterContext.Provider>,
    );
  });
});

beforeEach(() => {
  moves.length = 0;
  opened.length = 0;
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

it("a page's own router move is untouched", () => {
  router!.push("/crm");
  expect(moves).toEqual(["push /crm"]);
  expect(opened).toEqual([]);
});

it("a notice action's move to another page opens a new tab instead", () => {
  runAsNoticeAction(() => router!.push("/board/1"));
  runAsNoticeAction(() => router!.replace("/pricing"));
  expect(moves).toEqual([]);
  expect(opened).toEqual([`${window.location.origin}/board/1`, `${window.location.origin}/pricing`]);
});

it("a notice action may still change this page's own query", () => {
  runAsNoticeAction(() => router!.replace(`${window.location.pathname}?panels=x`));
  expect(moves).toEqual([`replace ${window.location.pathname}?panels=x`]);
});

it("a press inside a notice surface is a notice action for its click task", async () => {
  markNoticeClick();
  router!.push("/approvals");
  expect(opened).toEqual([`${window.location.origin}/approvals`]);
  await new Promise((r) => setTimeout(r, 0));
  router!.push("/crm");
  expect(moves).toEqual(["push /crm"]);
});

it("every toast action runs as a notice action, whatever the caller wrote", () => {
  toast("Board made", { action: { label: "Open", onClick: () => router!.push("/board/9") } });
  const options = mockSonner.mock.calls.at(-1)?.[1] as { action: { onClick: (e: unknown) => void } };
  options.action.onClick({});
  expect(moves).toEqual([]);
  expect(opened).toEqual([`${window.location.origin}/board/9`]);
});
