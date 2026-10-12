/**
 * The Workbooks / Documents homes' Recent model (Google Docs / Sheets' home): owner filter, the four
 * sorts, Today / Previous 7 days / Previous 30 days / Earlier groups, and the thumbnails' readers.
 * Each expectation names what a person would see go wrong if the rule broke.
 */

import {
  bucketOf,
  filterByOwner,
  groupHomeItems,
  homeDateLabel,
  sortHomeItems,
  type HomeItem,
} from "../recent";
import { docLines, sheetCellText } from "../RecordThumb";

const NOW = new Date(2026, 9, 12, 15, 0, 0).getTime(); // Oct 12 2026, 3 pm local
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

function item(id: string, name: string, over: Partial<HomeItem> = {}): HomeItem {
  return {
    row: null,
    id,
    name,
    description: null,
    ownerId: "me",
    createdAt: daysAgo(100),
    updatedAt: daysAgo(1),
    updatedBy: "me",
    sourceLabel: "Created",
    ...over,
  };
}

describe("owner filter", () => {
  const rows = [item("a", "Mine"), item("b", "Theirs", { ownerId: "them" })];
  it("Owned by me / Not owned by me split on the owner, Owned by anyone keeps all", () => {
    expect(filterByOwner(rows, "me", "me").map((r) => r.id)).toEqual(["a"]);
    expect(filterByOwner(rows, "not-me", "me").map((r) => r.id)).toEqual(["b"]);
    expect(filterByOwner(rows, "anyone", "me").map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("sorts", () => {
  const rows = [
    item("old-open", "Budget", { updatedAt: daysAgo(40) }),
    item("never", "Roster", { updatedAt: daysAgo(0.1) }),
    item("fresh-open", "Agenda", { updatedAt: daysAgo(20) }),
  ];
  const opened = new Map([
    ["old-open", daysAgo(3)],
    ["fresh-open", daysAgo(0.05)],
  ]);

  it("Last opened by me: what I opened, newest open first, then the never-opened by modified", () => {
    const s = sortHomeItems(rows, "opened", opened, "me");
    expect(s.map((d) => d.item.id)).toEqual(["fresh-open", "old-open", "never"]);
    expect(s.map((d) => d.verb)).toEqual(["Opened", "Opened", "Modified"]);
  });

  it("Last modified by me: my edits first, everyone else's after", () => {
    const mixed = [item("theirs", "A", { updatedBy: "them", updatedAt: daysAgo(0) }), item("mine", "B", { updatedAt: daysAgo(5) })];
    const s = sortHomeItems(mixed, "modified-by-me", new Map(), "me");
    expect(s.map((d) => d.item.id)).toEqual(["mine", "theirs"]);
    expect(s[0]!.verb).toBe("You modified");
  });

  it("Last modified: newest change first, whoever made it", () => {
    expect(sortHomeItems(rows, "modified", opened, "me").map((d) => d.item.id)).toEqual(["never", "fresh-open", "old-open"]);
  });

  it("Title A–Z has no time groups", () => {
    const s = sortHomeItems(rows, "title", opened, "me");
    expect(s.map((d) => d.item.name)).toEqual(["Agenda", "Budget", "Roster"]);
    const g = groupHomeItems(s, "title", NOW);
    expect(g).toHaveLength(1);
    expect(g[0]!.label).toBeNull();
  });
});

describe("groups", () => {
  it("buckets like Google: Today, Previous 7 days, Previous 30 days, Earlier", () => {
    expect(bucketOf(Date.parse(daysAgo(0.1)), NOW).label).toBe("Today");
    expect(bucketOf(Date.parse(daysAgo(3)), NOW).label).toBe("Previous 7 days");
    expect(bucketOf(Date.parse(daysAgo(20)), NOW).label).toBe("Previous 30 days");
    expect(bucketOf(Date.parse(daysAgo(90)), NOW).label).toBe("Earlier");
  });

  it("group keys never repeat even when a bucket label does", () => {
    const rows = [item("a", "A", { updatedAt: daysAgo(0.1) }), item("b", "B", { updatedAt: daysAgo(0.2) })];
    const opened = new Map([["a", daysAgo(0.01)]]);
    const g = groupHomeItems(sortHomeItems(rows, "opened", opened, "me"), "opened", NOW);
    const keys = g.map((x) => x.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("a card dated today shows a time, this year a day, older a year", () => {
    expect(homeDateLabel(Date.parse(daysAgo(0.1)), NOW)).toMatch(/\d:\d\d/);
    expect(homeDateLabel(Date.parse(daysAgo(30)), NOW)).not.toMatch(/2026/);
    expect(homeDateLabel(new Date(2024, 2, 3).getTime(), NOW)).toMatch(/2024/);
  });
});

describe("thumbnail readers", () => {
  it("a document's first lines keep headings and lists", () => {
    const lines = docLines({
      text: "Launch plan\rIntro text.\rFirst\rSecond\r\n",
      paras: [
        { i: 11, n: "HEADING_1" },
        { i: 23 },
        { i: 29, l: "ORDER_LIST" },
        { i: 36, l: "ORDER_LIST" },
      ],
    });
    expect(lines.map((l) => l.level)).toEqual(["h1", "body", "body", "body"]);
    expect(lines.map((l) => l.text)).toEqual(["Launch plan", "Intro text.", "1. First", "2. Second"]);
  });

  it("a sheet cell reads through dates, currency and percent formats", () => {
    expect(sheetCellText({ v: 46346, n: "yyyy-mm-dd" })).toMatch(/2026/);
    expect(sheetCellText({ v: 1234.5, n: "$#,##0.00" })).toBe(`$${(1234.5).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    expect(sheetCellText({ v: 0.25, n: "0%" })).toBe("25%");
    expect(sheetCellText({ v: "Clinic" })).toBe("Clinic");
    expect(sheetCellText(undefined)).toBe("");
  });
});
