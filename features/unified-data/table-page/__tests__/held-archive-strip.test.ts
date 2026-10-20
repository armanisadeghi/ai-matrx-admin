import { readFileSync } from "node:fs";
import { join } from "node:path";
import { keptHold, openHold } from "../heldArchive";
import { closeHeld, currentHeld, publishHeld, reopenHeld, visibleOffer, type HeldOffer } from "../heldArchiveStore";
import { emptyActionKeys, fitActions, foldableActions, splitFolded } from "../../../shell/components/header/route-header-layout";

const read = (p: string) => readFileSync(join(__dirname, p), "utf8");
const offer = (over: Partial<HeldOffer> = {}): HeldOffer => ({
  source: "The sheet", held: 5, confirm: "5:aaaaaaaaaaaa", kept: false, busy: false, onArchive: () => {}, onKeep: () => {}, ...over,
});

describe("the held-archive question is asked ONCE, in a strip above the grid (B-I3)", () => {
  it("the strip is mounted where every synced table's grid renders, and the header bars no longer draw the line", () => {
    const body = read("../UnifiedTable.tsx");
    expect(body).toContain("<HeldArchiveStrip");
    expect(body.indexOf("<HeldArchiveStrip")).toBeLessThan(body.indexOf("<OpeningTablePage"));
    // the line itself is drawn in exactly one place
    const line = read("../HeldArchiveLine.tsx");
    expect(line.match(/<HeldArchiveLine/g)).toHaveLength(1);
    expect(line).toContain("PromoBanner");
    // the question wraps through the package's own option, never a class from this side
    expect(line).toMatch(/<PromoBanner[^>]*\bwrap\b/s);
    expect(line).not.toContain("matrx-control-promo");
    for (const bar of ["../../../spaces/io/NotionSyncBar.tsx", "../SourceSyncBar.tsx", "../../connect-database/SyncedTableBar.tsx"]) {
      expect(read(bar)).not.toContain("<HeldArchiveLine");
    }
  });
  it("a bar's offer reaches the strip, and it shows only while a hold is open", () => {
    publishHeld("t1", "bar", offer());
    expect(visibleOffer(currentHeld("t1"), false)?.held).toBe(5);
    publishHeld("t1", "bar", null);
    expect(currentHeld("t1")).toBeNull();
    expect(visibleOffer(currentHeld("t1"), false)).toBeNull();
  });
});

describe("Keep turns the strip into an \"N kept\" chip that brings it back (B-M5)", () => {
  it("a kept hold is not open, but it is counted", () => {
    const kept = { archive_held: 4, archive_confirm: "4:aaaaaaaaaaaa", archive_kept: "4:aaaaaaaaaaaa" };
    expect(openHold(kept)).toBeNull();
    expect(keptHold(kept)).toEqual({ held: 4, confirm: "4:aaaaaaaaaaaa" });
    expect(keptHold({ ...kept, archive_kept: "3:bbbbbbbbbbbb" })).toBeNull();
    expect(keptHold({ archive_held: 0, archive_confirm: null })).toBeNull();
  });
  it("the strip hides a kept offer until the chip reopens it, and Keep again hides it", () => {
    publishHeld("t2", "bar", offer({ kept: true }));
    expect(visibleOffer(currentHeld("t2"), false)).toBeNull();
    reopenHeld("t2");
    expect(visibleOffer(currentHeld("t2"), true)?.kept).toBe(true);
    closeHeld("t2");
    publishHeld("t2", "bar", null);
  });
  it("every bar shows the chip in place of the synced time", () => {
    for (const bar of ["../../../spaces/io/NotionSyncBar.tsx", "../SourceSyncBar.tsx", "../../connect-database/SyncedTableBar.tsx"]) {
      expect(read(bar)).toContain("<HeldKeptChip");
    }
  });
});

describe("a header action that draws nothing never takes a fold position (B-I3)", () => {
  const a = (key: string) => ({ key });
  it("names the empty ones from their measured width", () => {
    expect(emptyActionKeys([{ key: "held", width: 0 }, { key: "synced", width: 120 }, { key: "x", width: 0 }])).toBe("held|x");
  });
  it("folds only drawn actions, and keeps the empty ones mounted in the row", () => {
    const actions = [a("held"), a("synced"), a("notion"), a("source"), a("more")];
    const foldable = foldableActions(actions, "held|notion|source");
    expect(foldable.map((x) => x.key)).toEqual(["synced", "more"]);
    const fit = fitActions([300, 40], 200, 36);
    expect(fit.fold).toBe(1);
    const { overflow, row } = splitFolded(actions, foldable, fit.fold);
    expect(overflow.map((x) => x.key)).toEqual(["synced"]);
    expect(row.map((x) => x.key)).toEqual(["held", "notion", "source", "more"]);
  });
});
