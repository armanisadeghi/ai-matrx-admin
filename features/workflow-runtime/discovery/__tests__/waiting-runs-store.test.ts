/**
 * ONE `GET /runs/waiting` per page (2026-10-22: one load of /agents/org-chart
 * sent five, each timing out at 15 s, each captured as an error).
 *
 * Four surfaces mount `useWaitingRuns` on one page and each asks on mount and
 * on every announce-channel reconnect. The store must turn that into one read,
 * collapse asks made during a read into one trailing read, and back off after
 * a failure instead of re-asking at once.
 */

import {
  createWaitingRunsStore,
  WAITING_BACKOFF_BASE_MS,
  WAITING_DEBOUNCE_MS,
} from "../waitingRunsStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

describe("waitingRunsStore", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("a page of four mounts, each asking twice, sends ONE request", async () => {
    const fetcher = jest.fn(async () => ({ data: { runs: [], total: 0 } }));
    const store = createWaitingRunsStore(fetcher);
    for (let i = 0; i < 4; i += 1) {
      store.subscribe(() => undefined);
      store.schedule(); // mount
      store.schedule(); // announce channel "open"
    }
    jest.advanceTimersByTime(WAITING_DEBOUNCE_MS);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ rows: [], loading: false, error: null });
  });

  it("asks made while a read is in flight collapse into one trailing read", async () => {
    const first = deferred<{ data: unknown }>();
    const fetcher = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({ data: { runs: [], total: 0 } });
    const store = createWaitingRunsStore(fetcher);
    store.subscribe(() => undefined);
    store.request();
    store.request();
    store.request();
    expect(fetcher).toHaveBeenCalledTimes(1);
    first.resolve({ data: { runs: [], total: 0 } });
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("a failed read is stated, keeps the last rows, and backs off before re-asking", async () => {
    const fetcher = jest.fn(async () => ({ error: { message: "Connection timed out after 15000ms" } }));
    const store = createWaitingRunsStore(fetcher);
    store.subscribe(() => undefined);
    store.request();
    await flush();
    expect(store.getSnapshot().error).toBe("Connection timed out after 15000ms");
    store.request(); // a reconnect right after the failure
    store.request();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(WAITING_BACKOFF_BASE_MS);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
