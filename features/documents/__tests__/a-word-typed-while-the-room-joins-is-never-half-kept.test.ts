import { holdCanLift, SETTLE_CAP_MS, TYPING_PAUSE_MS } from "../room-hold";

describe("the loading hold ends on a pause in typing, never mid-word", () => {
  const start = 10_000;
  test("nothing was refused: lift at once", () => {
    expect(holdCanLift({ now: start, lastRefusedAt: 0, settleStartedAt: start })).toBe(true);
  });
  test("a key was refused a moment ago: keep refusing, so the rest of the word is refused too", () => {
    expect(holdCanLift({ now: start + 50, lastRefusedAt: start, settleStartedAt: start })).toBe(false);
    expect(holdCanLift({ now: start + TYPING_PAUSE_MS - 1, lastRefusedAt: start, settleStartedAt: start })).toBe(false);
  });
  test("the person paused: lift", () => {
    expect(holdCanLift({ now: start + TYPING_PAUSE_MS, lastRefusedAt: start, settleStartedAt: start })).toBe(true);
  });
  test("someone who never stops typing is not held forever", () => {
    const now = start + SETTLE_CAP_MS;
    expect(holdCanLift({ now, lastRefusedAt: now - 10, settleStartedAt: start })).toBe(true);
  });
});
