// A RECORD CRUMB OPENS EVERY OTHER RECORD (Arman, 2026-10-22). The derived trail's record level gets
// its type's sibling loader (record-siblings.ts); switching keeps the view.
import { describe, expect, it } from "@jest/globals";
import { deriveTrail, type TrailNavNode } from "../derive-trail";
import { RECORD_SIBLINGS, recordSiblingsLoader, siblingHref } from "../record-siblings";

const A = "11111111-2222-4333-8444-555555555555";
const B = "99999999-2222-4333-8444-555555555555";
const NAV: TrailNavNode[] = [{ label: "Agents", href: "/agents/all", children: [{ label: "All Agents", href: "/agents/all" }] }];

describe("record siblings", () => {
  it("switching a record keeps the view", () => {
    expect(siblingHref(`/agents/${A}/build`, A, B)).toBe(`/agents/${B}/build`);
  });

  it("an id with reserved characters is matched and written encoded", () => {
    expect(siblingHref("/visual-maps/lab/workflow%3Aa", "workflow:a", "saved:b")).toBe("/visual-maps/lab/saved%3Ab");
  });

  it("CRM mailboxes, podcast shows and lab samples have sibling loaders", () => {
    for (const token of ["crm-sending-identity", "pc_show", "visual-map-sample"]) {
      expect(typeof RECORD_SIBLINGS[token]).toBe("function");
    }
  });

  it("agents have a sibling loader; an unknown type has none", () => {
    expect(typeof RECORD_SIBLINGS.agent).toBe("function");
    expect(recordSiblingsLoader("agent", A, `/agents/${A}/build`)).toBeInstanceOf(Function);
    expect(recordSiblingsLoader("no-such-type", A, `/x/${A}`)).toBeUndefined();
  });

  it("notes have a sibling loader: /notes/<a>/diff opens /notes/<b>/diff", () => {
    expect(typeof RECORD_SIBLINGS.note).toBe("function");
    expect(recordSiblingsLoader("note", A, `/notes/${A}/diff`)).toBeInstanceOf(Function);
    expect(siblingHref(`/notes/${A}/diff`, A, B)).toBe(`/notes/${B}/diff`);
  });

  it("the derived record level carries the loader as its door (classic and frame)", async () => {
    const loadOptions = async () => [{ label: "Other", href: `/agents/${B}/build` }];
    const t = deriveTrail({ pathname: `/agents/${A}/build`, nav: NAV, records: { [`/agents/${A}`]: { label: "QME Report", loadOptions } } });
    const record = t.find((c) => c.label === "QME Report")!;
    expect(record.href).toBe(`/agents/${A}`);
    expect(await record.loadOptions!()).toEqual([{ label: "Other", href: `/agents/${B}/build` }]);
  });
});
