import { toE164Phone } from "../phoneUtils";

describe("toE164Phone — the strict door for phone sign-in", () => {
  it.each([
    ["(949) 666-2578", "+19496662578"],
    ["949.666.2578", "+19496662578"],
    ["1 949 666 2578", "+19496662578"],
    ["+1 949 666 2578", "+19496662578"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("normalizes %s", (raw, e164) => {
    expect(toE164Phone(raw)).toBe(e164);
  });

  it.each(["", "  ", "12345", "555-0123", "44 20 7946 0958", "+0123456789", "+1234567890123456"])(
    "refuses %p",
    (raw) => {
      expect(toE164Phone(raw)).toBeNull();
    },
  );
});
