/**
 * MEETING + SANDBOX: ONE ROW OF CHROME, THE HOST NAMES THE RECORD.
 *
 * Platform review (2026-10-22): a meeting on a Board tile showed its name three
 * times (tile header, strip title, h2) and 12 buttons in three rows; a sandbox
 * showed its name and status again in a footer strip and kept four loose
 * buttons. Source contract (the real components need a store, a router and a
 * live channel):
 *  - an embedded bar never prints the record's name; the host does;
 *  - both fold their secondary actions into the canonical menu
 *    (`RecordActionsMenu` -> v3 `ItemMenu`), never a hand-rolled dropdown;
 *  - the sandbox has no footer strip repeating name / status / time.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const meeting = read("features/meet/components/manage/MeetingDetail.tsx");
const sandbox = read("features/code/views/sandboxes/SandboxRecord.tsx");
const menu = read("components/official/RecordActionsMenu.tsx");

const slice = (src: string, from: string) => {
  const i = src.indexOf(from);
  expect(i).toBeGreaterThan(-1);
  return src.slice(i);
};

describe("meeting + sandbox one-row chrome", () => {
  it("the shared menu is the canonical ItemMenu", () => {
    expect(menu).toContain('from "@ai-matrx/design-system/item"');
    expect(menu).not.toContain("DropdownMenu");
  });

  it("the embedded meeting bar does not print the meeting name", () => {
    const bar = slice(meeting, "function EmbeddedMeetingBar(");
    const body = bar.slice(0, bar.indexOf("function BriefBlock") > 0 ? bar.indexOf("function BriefBlock") : undefined);
    expect(body).not.toContain("meeting.title");
    expect(body).toContain("<RecordActionsMenu");
  });

  it("the meeting details body has no visible second title", () => {
    expect(meeting).toContain('<h1 className="sr-only">{meeting.title}</h1>');
    expect(meeting).not.toMatch(/<h1 className="text-xl/);
  });

  it("the meeting page and bar use no hand-rolled dropdown", () => {
    expect(meeting).not.toContain("DropdownMenuContent");
    expect(meeting).toContain("<RecordActionsMenu");
  });

  it("the sandbox has no footer strip repeating name, status and time", () => {
    expect(sandbox).not.toContain("<footer");
    // one status chip: the header's
    expect(sandbox.match(/<Badge variant=\{statusVariant\}/g)?.length).toBe(1);
  });

  it("the embedded sandbox bar names nothing and folds actions into the menu", () => {
    const header = slice(sandbox, "function SandboxHeader(");
    expect(header).toContain("hostNames");
    expect(header).toContain("<RecordActionsMenu");
    expect(header).not.toContain("detailActions");
  });
});
