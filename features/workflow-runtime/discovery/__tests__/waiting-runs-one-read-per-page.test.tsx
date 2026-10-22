/**
 * Four surfaces on one page (header badge, bell source, inbox, org chart) mount
 * `useWaitingRuns`, and the announce channel opens under them: the page sends
 * ONE `GET /runs/waiting`. Before the shared store it sent one per mount plus
 * one per mount per reconnect — five 15 s timeouts on /agents/org-chart
 * (2026-10-22).
 */

import { act } from "react";
import { createRoot } from "react-dom/client";

const callApi = jest.fn((config: { path: string }) => Promise.resolve({ data: { runs: [], total: 0 }, path: config.path }));
let statusHandlers: Array<(status: "open" | "closed") => void> = [];

jest.mock("@/lib/api/call-api", () => ({ callApi: (config: { path: string }) => callApi(config) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => (thunk: unknown) => thunk }));
jest.mock("../useRunAnnouncements", () => ({
  useRunAnnouncements: (handlers: { onStatus?: (status: "open" | "closed") => void }) => {
    if (handlers.onStatus) statusHandlers.push(handlers.onStatus);
  },
}));

import { useWaitingRuns } from "../useWaitingRuns";

function Surface() {
  const { rows } = useWaitingRuns();
  return <span>{rows.length}</span>;
}

describe("useWaitingRuns — one read per page", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    callApi.mockClear();
    statusHandlers = [];
  });
  afterEach(() => jest.useRealTimers());

  it("four mounts and a channel open send one request", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const root = createRoot(document.createElement("div"));
    act(() => {
      root.render(
        <>
          <Surface />
          <Surface />
          <Surface />
          <Surface />
        </>,
      );
    });
    act(() => {
      for (const onStatus of statusHandlers) onStatus("open");
    });
    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(callApi.mock.calls.filter(([config]) => config.path === "/runs/waiting")).toHaveLength(1);
  });
});
