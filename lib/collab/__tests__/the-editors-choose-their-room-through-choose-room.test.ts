/**
 * Source contract for the C10 fallback: the Docs and Workbook editors open their co-editing room only through
 * `chooseRoom`, which retries a failed room check under "Reconnecting…". Calling the package's
 * `*UsesOrderedRoom` directly would read a failed check as "no room" and join the relay for a flipped room.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(__dirname, "../../..", rel), "utf8");

describe.each([
  ["features/documents/components/DocumentEditor.tsx", "documentUsesOrderedRoom"],
  ["features/workbooks/components/WorkbookEditor.tsx", "workbookUsesOrderedRoom"],
])("%s", (file, packageFn) => {
  const src = read(file);

  it("asks the room through chooseRoom, not the package function alone", () => {
    expect(src).toContain('from "@/lib/collab/choose-room"');
    expect(src).toMatch(/await chooseRoom\(\{/);
    // the package function appears only as the `usesOrderedRoom` argument of chooseRoom
    const direct = src.split(`await ${packageFn}(`).length - 1;
    expect(direct).toBe(0);
  });

  it("shows a Reconnecting status while the check is unanswered", () => {
    expect(src).toMatch(/onReconnecting:[^\n]*"reconnecting"/);
  });

  it("a room that cannot be chosen is announced, never joined as the relay", () => {
    const afterChoose = src.slice(src.indexOf("await chooseRoom({"));
    expect(afterChoose.slice(0, 2600)).toContain("Live editing is not connected");
  });
});

it("the save-status mark says Reconnecting…", () => {
  const src = read("components/editor-chrome/EditorTitleField.tsx");
  expect(src).toContain('"reconnecting"');
  expect(src).toContain("Reconnecting…");
});
