import { avatarInitial } from "../avatarInitial";

describe("avatarInitial (MKT-147)", () => {
  it("uses the display name before the handle", () => {
    expect(avatarInitial("Ballerina Farm", "61555123")).toBe("B");
  });
  it("never shows a digit from a numeric id", () => {
    expect(avatarInitial(null, "61555123")).toBe("?");
    expect(avatarInitial("", "profile.php?id=6155")).toBe("P");
  });
  it("skips a leading @", () => {
    expect(avatarInitial("@ballerinafarm")).toBe("B");
  });
});
