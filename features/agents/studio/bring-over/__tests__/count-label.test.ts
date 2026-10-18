import { countLabel } from "../count-label";

describe("countLabel", () => {
  it("says one message and two messages", () => {
    expect(countLabel(1, "message")).toBe("1 message");
    expect(countLabel(2, "message")).toBe("2 messages");
    expect(countLabel(0, "file")).toBe("0 files");
  });
});
