import { shownNotices } from "../NotionSyncBar";

describe("a held archive is asked about, never shown as a raw agent call", () => {
  const held = 'Nothing was archived in “Probe”: this sync would have archived 2 of its 2 rows … confirm with: {"action": "notion_sync", "args": {"confirm_archive": "2:daec759f0dd6"}}';
  it("drops the hold's own notice when the bar asks instead", () => {
    expect(shownNotices({ archive_held: 2, archive_confirm: "2:daec759f0dd6", notices: [held, "3 files kept their links"] })).toEqual(["3 files kept their links"]);
  });
  it("keeps every notice when nothing is held", () => {
    expect(shownNotices({ notices: ["3 files kept their links"] })).toEqual(["3 files kept their links"]);
  });
});
