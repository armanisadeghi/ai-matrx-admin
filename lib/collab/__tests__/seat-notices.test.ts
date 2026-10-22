import { notSharedNotice, seatRefusal } from "../seat-notices";

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

describe("the rollback notice for a change that cannot be shared", () => {
  it("names the table when a table was the change", () => {
    expect(notSharedNotice("sheet.mutation.add-table").description).toBe("Tables can't be shared while others are editing yet — your table was removed.");
  });
  it("never says the vague old line", () => {
    for (const id of [undefined, "sheet.mutation.something-else", "sheet.mutation.add-table"]) {
      const n = notSharedNotice(id);
      expect(`${n.title} ${n.description}`).not.toContain("That change was undone");
      expect(n.description.length).toBeLessThan(100);
    }
  });
});
