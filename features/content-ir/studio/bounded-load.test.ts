import {
  RECONNECT_RETRY_DELAYS_MS,
  SHAPE_LOAD_DEADLINE_MS,
  isLoadTimeoutError,
  startReconnectRetry,
  withLoadDeadline,
  type ReconnectRetryEnv,
} from "./bounded-load";

describe("withLoadDeadline", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("a load that never answers ends in a named TimeoutError, not a forever wait", async () => {
    const stalled = new Promise<never>(() => {});
    const outcome = withLoadDeadline(stalled, "the saved examples").then(
      () => "resolved",
      (error: unknown) => error,
    );
    jest.advanceTimersByTime(SHAPE_LOAD_DEADLINE_MS);
    const error = await outcome;
    expect(isLoadTimeoutError(error)).toBe(true);
    expect((error as Error).message).toContain("the saved examples");
  });

  it("passes a real answer and a real failure straight through", async () => {
    await expect(withLoadDeadline(Promise.resolve(7), "x")).resolves.toBe(7);
    await expect(
      withLoadDeadline(Promise.reject(new TypeError("Failed to fetch")), "x"),
    ).rejects.toThrow("Failed to fetch");
  });
});

function fakeEnv() {
  const online = new Set<() => void>();
  const visible = new Set<() => void>();
  const timers: { fn: () => void; ms: number; live: boolean }[] = [];
  const env: ReconnectRetryEnv = {
    onOnline: (l) => (online.add(l), () => online.delete(l)),
    onVisible: (l) => (visible.add(l), () => visible.delete(l)),
    setTimer: (fn, ms) => {
      const t = { fn, ms, live: true };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as { live: boolean }).live = false;
    },
  };
  const liveTimer = () => timers.filter((t) => t.live).at(-1);
  return { env, online, visible, liveTimer };
}

describe("startReconnectRetry", () => {
  it("retries the moment the connection returns", () => {
    const { env, online } = fakeEnv();
    const retry = jest.fn();
    startReconnectRetry(retry, env);
    online.forEach((l) => l());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("retries when the tab becomes visible", () => {
    const { env, visible } = fakeEnv();
    const retry = jest.fn();
    startReconnectRetry(retry, env);
    visible.forEach((l) => l());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps retrying on a bounded backoff that never goes past its last step", () => {
    const { env, liveTimer } = fakeEnv();
    const retry = jest.fn();
    startReconnectRetry(retry, env);
    const seen: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const t = liveTimer()!;
      seen.push(t.ms);
      t.fn();
    }
    expect(retry).toHaveBeenCalledTimes(7);
    const last = RECONNECT_RETRY_DELAYS_MS[RECONNECT_RETRY_DELAYS_MS.length - 1];
    expect(seen.slice(0, 4)).toEqual([...RECONNECT_RETRY_DELAYS_MS]);
    expect(Math.max(...seen)).toBe(last);
  });

  it("stops completely once the load has landed", () => {
    const { env, online, visible, liveTimer } = fakeEnv();
    const retry = jest.fn();
    const stop = startReconnectRetry(retry, env);
    stop();
    expect(liveTimer()).toBeUndefined();
    expect(online.size + visible.size).toBe(0);
    expect(retry).not.toHaveBeenCalled();
  });
});
