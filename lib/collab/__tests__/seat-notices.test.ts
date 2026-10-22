import { seatRefusal } from "../seat-notices";

describe("the refusal names the product", () => {
  it("a Doc says document", () => {
    expect(seatRefusal(true)).toContain("this document");
    expect(seatRefusal(false, "document")).toContain("this document");
  });
  it("a Sheet says spreadsheet, never document", () => {
    for (const may of [true, false]) {
      expect(seatRefusal(may, "spreadsheet")).toContain("this spreadsheet");
      expect(seatRefusal(may, "spreadsheet")).not.toContain("document");
    }
  });
});
