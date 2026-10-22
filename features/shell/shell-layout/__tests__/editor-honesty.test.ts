/**
 * THE LAYOUT EDITOR TELLS THE TRUTH (audit 2026-10-22 #6, #8, #9, #12).
 *   #6  a member under the organization's lock (org layout present) gets no Save and no live preview;
 *   #8  an archived organization is offered no editor, and its refusal is plain words, not storage jargon;
 *   #9  the window title follows the tab; a record added to the header is a "Page", never a "Link";
 *   #12 org "Reset to standard" and the "Members may customize" switch say they worked.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("@ai-matrx/records/react", () => ({ removeAppRow: jest.fn(), upsertAppRow: jest.fn() }));
jest.mock("@ai-matrx/records/versions", () => ({ readVersionNow: jest.fn() }));
jest.mock("@ai-matrx/records/core", () => ({ createRecordsClient: jest.fn() }));

import { plainLayoutRefusal } from "../service";

const root = join(__dirname, "../../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("#8 archived organization", () => {
  it("the store's archived refusal becomes plain words; other refusals pass through unchanged", () => {
    const refusal = "This organization is archived, so creating a table is not possible there until an owner restores it.";
    expect(plainLayoutRefusal(refusal)).toBe("This organization is archived. Restore it to change its layout.");
    expect(plainLayoutRefusal("You may not do that.")).toBe("You may not do that.");
  });
  it("Organization settings › Layout offers no editor for an archived organization", () => {
    const src = read("features/shell/shell-layout/editor/OrgLayoutSection.tsx");
    expect(src).toMatch(/organizationArchiveState\(organizationId\)/);
    expect(src).toMatch(/if \(archived\)/);
  });
});

describe("#9 the window says what it edits", () => {
  it("the header row of an in-app link is a Page; an outside link is a Link", async () => {
    jest.resetModules();
    const { headerKindWord } = await import("../editor/HeaderPane");
    expect(headerKindWord({ kind: "link", id: "a", label: "Brand Curator", icon: "FileText", href: "/agents/a6f7" })).toBe("Page");
    expect(headerKindWord({ kind: "link", id: "b", label: "Example", icon: "Link2", href: "https://example.com" })).toBe("Link");
  });
  it("the title follows the tab shown", () => {
    const src = read("features/window-panels/windows/shell-layout/ShellLayoutEditorWindow.tsx");
    expect(src).toMatch(/TITLE\[shown\]/);
    expect(src).toMatch(/onRegionChange=\{setShown\}/);
  });
});

describe("#6 and #12 in the editor", () => {
  const src = read("features/shell/shell-layout/editor/ShellLayoutEditor.tsx");
  it("a locked member (organization layout present) has no Save and no live preview", () => {
    expect(src).toMatch(/const locked = target === "person" && !allowed && store\.organization !== null;/);
    expect(src).toMatch(/disabled=\{locked \|\|/);
    expect(src).toMatch(/dirty && !locked \?/);
  });
  it("org Reset to standard and the members switch confirm with a toast", () => {
    expect(src).toMatch(/toast\.success\(target === "organization" \? "The organization uses the standard layout"/);
    expect(src).toMatch(/toast\.success\(next \? "Members may use their own layout"/);
  });
});
