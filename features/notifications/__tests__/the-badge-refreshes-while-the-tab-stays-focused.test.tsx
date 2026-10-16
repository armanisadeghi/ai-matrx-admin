/**
 * @jest-environment jsdom
 */
// The 5-minute poll was removed with no replacement, so a notice arriving while the tab stayed
// focused never reached the bell. The badge now refetches every 5 minutes ONLY while the tab is
// visible, and never before the page settles (the query is `enabled` only then).

import type React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fetchMyWorkWaiting = jest.fn(async () => []);
jest.mock("../service", () => ({ fetchMyWorkWaiting: () => fetchMyWorkWaiting() }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "user-1" }));
jest.mock("@/lib/boot/lateIdle", () => ({ useLateIdleReady: () => true }));
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock("@/features/approvals/usePendingApprovalCount", () => ({ usePendingApprovalCount: () => ({}) }));
jest.mock("../useInboxMemory", () => ({ useInboxMemory: () => ({}) }));

import { INBOX_BADGE_POLL_MS, badgeRefetchInterval, useWorkWaiting } from "../useInbox";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

function Probe({ enabled }: { enabled: boolean }): null {
  useWorkWaiting(enabled);
  return null;
}

async function mount(enabled: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(
      (<QueryClientProvider client={client}><Probe enabled={enabled} /></QueryClientProvider>) as React.ReactElement,
    );
  });
  return { root, client };
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMyWorkWaiting.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
  setVisibility("visible");
});

it("is 5 minutes while visible and off while hidden", () => {
  setVisibility("visible");
  expect(badgeRefetchInterval()).toBe(INBOX_BADGE_POLL_MS);
  expect(INBOX_BADGE_POLL_MS).toBe(300_000);
  setVisibility("hidden");
  expect(badgeRefetchInterval()).toBe(false);
});

it("re-reads every 5 minutes while the tab is visible", async () => {
  setVisibility("visible");
  const { root } = await mount(true);
  expect(fetchMyWorkWaiting).toHaveBeenCalledTimes(1);
  await act(async () => { await jest.advanceTimersByTimeAsync(INBOX_BADGE_POLL_MS + 10); });
  expect(fetchMyWorkWaiting).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});

it("does not read before the page settles (query disabled)", async () => {
  setVisibility("visible");
  const { root } = await mount(false);
  await act(async () => { await jest.advanceTimersByTimeAsync(INBOX_BADGE_POLL_MS * 2); });
  expect(fetchMyWorkWaiting).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it("does not poll while the tab is hidden", async () => {
  setVisibility("visible");
  const { root } = await mount(true);
  setVisibility("hidden");
  await act(async () => { await jest.advanceTimersByTimeAsync(INBOX_BADGE_POLL_MS * 3); });
  expect(fetchMyWorkWaiting).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
