import { accountHandleLine } from "../SmartAddExtras";

describe("a Facebook page known only by its number (MKT-098)", () => {
  it("shows its address, never a number as a handle", () => {
    expect(accountHandleLine("facebook", "61555299431119")).toBe("facebook.com/profile.php?id=61555299431119");
  });
  it("keeps a named page and other platforms as @handle", () => {
    expect(accountHandleLine("facebook", "sourdoughmama")).toBe("@sourdoughmama");
    expect(accountHandleLine("instagram", "1234567")).toBe("@1234567");
  });
});
