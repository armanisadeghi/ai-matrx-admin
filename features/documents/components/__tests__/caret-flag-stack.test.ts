import { flagSlots } from "../caretFlagStack";

describe("name flags of carets at one spot stack instead of overlapping", () => {
  it("two carets at the same spot get slots 0 and 1", () => {
    expect(flagSlots([{ left: 100, top: 40 }, { left: 101, top: 40 }])).toEqual([0, 1]);
  });
  it("three at one spot get 0,1,2; a far caret stays at 0", () => {
    expect(flagSlots([{ left: 10, top: 10 }, { left: 10, top: 10 }, { left: 12, top: 11 }, { left: 300, top: 10 }])).toEqual([0, 1, 2, 0]);
  });
  it("carets on different lines do not stack", () => {
    expect(flagSlots([{ left: 10, top: 10 }, { left: 10, top: 40 }])).toEqual([0, 0]);
  });
});
