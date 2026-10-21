/**
 * The server's fold (agent reads and writes, downloads, share links) and the transform fuzz load the sheet room's
 * plugins from one list in @ai-matrx/office (`SHEET_ROOM_EDITOR_PRESETS`: each editor preset → the headless plugin
 * packages that hold workbook state). A preset added to or removed from the workbook editor without that list
 * changing would leave the fold unable to read rooms carrying its ops (COLLAB-DESIGN §24.1). This fails then.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { SHEET_ROOM_EDITOR_PRESETS } from "@ai-matrx/office/univer/collab";

const EDITOR = path.join(__dirname, "../components/WorkbookEditor.tsx");

describe("the fold loads every workbook editor preset", () => {
  it("the editor's presets are exactly the sheet room's list", () => {
    const src = readFileSync(EDITOR, "utf8");
    const used = new Set([...src.matchAll(/\b(Univer\w+Preset)\(/g)].map((m) => m[1]!));
    if (/registerPlugin\(UniverActionRecorderPlugin|UniverActionRecorderPlugin[,\s\]]/.test(src)) used.add("UniverActionRecorderPlugin");
    expect([...used].sort()).toEqual(Object.keys(SHEET_ROOM_EDITOR_PRESETS).sort());
  });
});
