/** The print host and style are cleaned up even when the browser never fires `afterprint`. */
import { attachPrintCleanup } from "../deck-export";

describe("printDeck cleanup", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("runs once on afterprint", () => {
    const cleanup = jest.fn();
    attachPrintCleanup(cleanup, 1000);
    window.dispatchEvent(new Event("afterprint"));
    window.dispatchEvent(new Event("afterprint"));
    jest.advanceTimersByTime(5000);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs on the timeout when afterprint never fires", () => {
    const cleanup = jest.fn();
    attachPrintCleanup(cleanup, 1000);
    jest.advanceTimersByTime(999);
    expect(cleanup).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs when the tab becomes visible again without afterprint", () => {
    const cleanup = jest.fn();
    attachPrintCleanup(cleanup, 600_000);
    document.dispatchEvent(new Event("visibilitychange"));
    jest.advanceTimersByTime(1500);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
