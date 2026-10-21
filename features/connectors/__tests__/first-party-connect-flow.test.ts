/**
 * CONNECTING GMAIL FROM THE CHAT WAITS FOR THE DIALOG, THEN PROVES THE GRANT (defect C, round 2).
 *
 * The first version waited at most 10 s for the consent dialog to be SEEN opening and then read the
 * account — so a dialog that opened later than that (a cold lazy chunk) was read while still up and
 * answered "not connected"; it noticed "open" only on the next store change, so a dialog already up
 * when it subscribed was missed; and it trusted one read of an account list that may not have caught
 * up. Mutation: restore the 10 s give-up, or skip the initial state check, or the retry — the matching
 * case below goes RED.
 */
import { OPEN_WAIT_MS, connectLanded, waitForOverlayClosed, type StoreLike } from "../first-party-connect-flow";

function fakeStore(): StoreLike & { set: (open: boolean) => void } {
  let open = false;
  const listeners = new Set<() => void>();
  return {
    getState: () => ({ open }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      open = next;
      listeners.forEach((l) => l());
    },
  };
}
const isOpen = (state: unknown) => (state as { open: boolean }).open;

describe("waiting for the consent dialog", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("resolves only once the dialog has been seen open and is closed again", async () => {
    const store = fakeStore();
    const wait = waitForOverlayClosed(store, isOpen);
    let outcome: string | null = null;
    void wait.done.then((o) => (outcome = o));
    store.set(true);
    await Promise.resolve();
    expect(outcome).toBeNull();
    store.set(false);
    await expect(wait.done).resolves.toBe("closed");
  });

  it("a dialog that opens LATER than the old 10 s give-up is still waited for", async () => {
    const store = fakeStore();
    const wait = waitForOverlayClosed(store, isOpen);
    let outcome: string | null = null;
    void wait.done.then((o) => (outcome = o));
    jest.advanceTimersByTime(12_000);
    await Promise.resolve();
    expect(outcome).toBeNull();
    store.set(true);
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(outcome).toBeNull();
    store.set(false);
    await expect(wait.done).resolves.toBe("closed");
  });

  it("sees a dialog that was already open when it started waiting", async () => {
    const store = fakeStore();
    store.set(true);
    const wait = waitForOverlayClosed(store, isOpen);
    store.set(false);
    await expect(wait.done).resolves.toBe("closed");
  });

  it("says the dialog never opened when it does not appear within the open wait", async () => {
    const store = fakeStore();
    const wait = waitForOverlayClosed(store, isOpen);
    jest.advanceTimersByTime(OPEN_WAIT_MS + 1);
    await expect(wait.done).resolves.toBe("never_opened");
  });

  it("stops listening once it has an answer", async () => {
    const store = fakeStore();
    const spy = jest.spyOn(store, "subscribe");
    const wait = waitForOverlayClosed(store, isOpen);
    store.set(true);
    store.set(false);
    await wait.done;
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("deciding whether the grant landed", () => {
  const instantly = async () => undefined;

  it("true as soon as a fresh read proves it", async () => {
    const read = jest.fn().mockResolvedValue({ fingerprint: "after", proven: true });
    await expect(connectLanded("before", read, { wait: instantly })).resolves.toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("a cancel (the account did not change) is answered at once, with no wait and one read", async () => {
    const read = jest.fn().mockResolvedValue({ fingerprint: "before", proven: false });
    const wait = jest.fn(instantly);
    await expect(connectLanded("before", read, { wait })).resolves.toBe(false);
    expect(read).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("an account that changed but does not prove it yet is read once more", async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ fingerprint: "changed", proven: false })
      .mockResolvedValueOnce({ fingerprint: "changed", proven: true });
    await expect(connectLanded("before", read, { wait: instantly })).resolves.toBe(true);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("and still says no when the second read does not prove it either", async () => {
    const read = jest.fn().mockResolvedValue({ fingerprint: "changed", proven: false });
    await expect(connectLanded("before", read, { wait: instantly })).resolves.toBe(false);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
