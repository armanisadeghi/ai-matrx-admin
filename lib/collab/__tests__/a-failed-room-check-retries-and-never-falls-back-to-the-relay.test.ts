import { chooseRoom } from "../choose-room";

const base = () => {
  const reconnecting: boolean[] = [];
  return {
    reconnecting,
    onReconnecting: (v: boolean) => reconnecting.push(v),
    cancelled: () => false,
    sleep: jest.fn(async () => {}),
  };
};

beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("a failed room check", () => {
  it("retries with growing waits, says Reconnecting, and opens the ordered room once the check answers", async () => {
    const b = base();
    const roomExists = jest.fn().mockRejectedValueOnce(new Error("net")).mockRejectedValueOnce(new Error("net")).mockResolvedValue(true);
    const usesOrderedRoom = jest.fn().mockResolvedValue(false); // the package's own answer while offline: no buffer, no room known
    const out = await chooseRoom({ ...b, roomExists, usesOrderedRoom });
    expect(out).toBe(true);
    expect(b.reconnecting).toEqual([true, false]);
    expect(b.sleep.mock.calls.map((c) => (c as unknown as number[])[0])).toEqual([1000, 2000]);
  });

  it("NEVER answers 'relay' while the check keeps failing (it waits until the editor closes)", async () => {
    const b = base();
    let calls = 0;
    const out = await chooseRoom({
      ...b,
      cancelled: () => calls++ > 12,
      roomExists: async () => {
        throw new Error("offline");
      },
      usesOrderedRoom: async () => false,
    });
    expect(out).toBeNull();
    expect(b.reconnecting).toEqual([true]);
    const waits = b.sleep.mock.calls.map((c) => (c as unknown as number[])[0]);
    expect(waits.length).toBeGreaterThan(5);
    expect(Math.max(...waits)).toBe(15000); // backoff is capped
  });

  it("a device holding unsent edits for the room opens the ordered room at once, without waiting", async () => {
    const b = base();
    const out = await chooseRoom({
      ...b,
      roomExists: async () => {
        throw new Error("offline");
      },
      usesOrderedRoom: async () => true,
    });
    expect(out).toBe(true);
    expect(b.sleep).not.toHaveBeenCalled();
    expect(b.reconnecting).toEqual([]);
  });

  it("an answered 'no room' goes to the package rules (relay for a record that never flipped) with no Reconnecting", async () => {
    const b = base();
    const out = await chooseRoom({ ...b, roomExists: async () => false, usesOrderedRoom: async () => false });
    expect(out).toBe(false);
    expect(b.reconnecting).toEqual([]);
    expect(b.sleep).not.toHaveBeenCalled();
  });

  it("the knob can still open a new record in the ordered room when the room does not exist yet", async () => {
    const b = base();
    expect(await chooseRoom({ ...b, roomExists: async () => false, usesOrderedRoom: async () => true })).toBe(true);
  });
});
