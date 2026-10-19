/**
 * A person's note save waits while an agent of an Orchestra holds the note (PT423), then saves;
 * past the knob's wait it refuses in words. Any other error passes straight through.
 */
const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: () => ({ rpc }) } }));

import { isEditHeld, throwIfHeld, whileAgentHoldsTheNote } from "../noteEditHold";

const HELD = { code: "PT423", message: "An agent is editing this right now" };

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (_fn: string, args: { p_key: string }) => ({
    data: args.p_key === "edit_hold_wait_seconds" ? 1 : 10,
    error: null,
  }));
});

it("recognizes only the hold", () => {
  expect(isEditHeld(HELD)).toBe(true);
  expect(isEditHeld({ code: "23514" })).toBe(false);
  expect(() => throwIfHeld({ error: HELD })).toThrow();
  expect(throwIfHeld({ error: null, data: 1 })).toEqual({ error: null, data: 1 });
});

it("waits for the hold to clear, then saves", async () => {
  let calls = 0;
  const result = await whileAgentHoldsTheNote("org", async () => {
    calls += 1;
    if (calls < 3) throw HELD;
    return "saved";
  });
  expect(result).toBe("saved");
  expect(calls).toBe(3);
});

it("refuses in words past the wait", async () => {
  await expect(
    whileAgentHoldsTheNote("org", async () => {
      throw HELD;
    }),
  ).rejects.toThrow(/an agent is still editing it/);
});

it("passes any other error straight through, without waiting", async () => {
  const boom = { code: "42501", message: "no" };
  await expect(
    whileAgentHoldsTheNote("org", async () => {
      throw boom;
    }),
  ).rejects.toBe(boom);
  expect(rpc).not.toHaveBeenCalled();
});
