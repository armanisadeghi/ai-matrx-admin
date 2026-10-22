import { yesNoFor } from "../validate/queue";

// Live 2026-10-22 (Four Barrel Coffee, a fresh Smart Add brand): the main name was confirmed at Create; Yes on the
// LinkedIn display name "FOURBARREL COFFEE" on the validate page renamed the brand to it. Yes on a name card means
// "this is also our name" once the brand has a real name.
describe("Yes on a name card", () => {
  it("is an alias when the brand already has a different real name", () => {
    expect(yesNoFor({ kind: "name", value: "FOURBARREL COFFEE" }, "Four Barrel Coffee").yes).toBe("alias");
    expect(yesNoFor({ kind: "name", value: "Four Barrel, Portola" }, "Four Barrel Coffee").yes).toBe("alias");
  });
  it("is preferred while the brand has no real name, or names the same name", () => {
    expect(yesNoFor({ kind: "name", value: "Four Barrel Coffee" }, "").yes).toBe("preferred");
    expect(yesNoFor({ kind: "name", value: "Four Barrel Coffee" }, "Unknown").yes).toBe("preferred");
    expect(yesNoFor({ kind: "name", value: "Four Barrel Coffee, Inc." }, "Four Barrel Coffee").yes).toBe("preferred");
  });
  it("leaves other kinds as they were", () => {
    expect(yesNoFor({ kind: "fact", value: "x" }, "B")).toEqual({ yes: "correct", no: "wrong" });
    expect(yesNoFor({ kind: "account", value: "x" }, "B")).toEqual({ yes: "ours", no: "not_us" });
    expect(yesNoFor({ kind: "name", value: "Other Co" }, "B").no).toBe("not_us");
  });
});
