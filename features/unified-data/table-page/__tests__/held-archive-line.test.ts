import { readFileSync } from "node:fs";
import { join } from "node:path";
import { heldSentence, openHold } from "../heldArchive";

describe("a held archive is ONE question on every synced table's bar (review 7)", () => {
  it("asks in one plain line, and says when the hold changed under an Archive click", () => {
    expect(heldSentence("Airtable", 12)).toBe("Airtable no longer lists 12 rows. Archive them?");
    expect(heldSentence("Notion", 1)).toBe("Notion no longer lists 1 row. Archive them?");
    expect(heldSentence("The sheet", 5, 3)).toBe("The sheet no longer lists rows: now 5 rows (was 3). Archive them?");
  });
  it("Keep is remembered per fingerprint: the same hold stays quiet, a different one asks again", () => {
    expect(openHold({ archive_held: 4, archive_confirm: "4:aaaaaaaaaaaa", archive_kept: "4:aaaaaaaaaaaa" })).toBeNull();
    expect(openHold({ archive_held: 5, archive_confirm: "5:bbbbbbbbbbbb", archive_kept: "4:aaaaaaaaaaaa" })).toEqual({ held: 5, confirm: "5:bbbbbbbbbbbb" });
    expect(openHold({ archive_held: 0, archive_confirm: null })).toBeNull();
  });
  it("Notion, Airtable/GitHub and the synced-table bar all render the one component, none a copy", () => {
    const read = (p: string) => readFileSync(join(__dirname, p), "utf8");
    for (const bar of ["../../../spaces/io/NotionSyncBar.tsx", "../SourceSyncBar.tsx", "../../connect-database/SyncedTableBar.tsx"]) {
      const src = read(bar);
      expect(src).toContain("<HeldArchiveLine");
      expect(src).toContain("answerHold(");
      expect(src).not.toMatch(/Archive them\?/);
    }
  });
});
