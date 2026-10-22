import { countedKind } from "../countedKind";

describe("the import report's counts say their noun in the right number", () => {
  it.each([
    [1, "tables", "1 table"],
    [1, "pages", "1 page"],
    [1, "rows", "1 row"],
    [1, "columns", "1 column"],
    [1, "row pages", "1 row page"],
    [1, "entries", "1 entry"],
    [0, "tables", "0 tables"],
    [2, "tables", "2 tables"],
    [166, "pages", "166 pages"],
    [1, "synced blocks", "1 synced block"],
  ])("%s %s -> %s", (n, kind, line) => {
    expect(countedKind(n, kind)).toBe(line);
  });
});
