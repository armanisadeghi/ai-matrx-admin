// AT-SHARE rows 2 and 3 — the pure rules behind the table header's two controls.

import { activitySentence, canAskForEdit, parseActivity } from "../tableAccessService";

describe("who may ask for edit access", () => {
  it("a viewer and a commenter may; an editor, a Full holder and an owner may not; nobody known may not", () => {
    expect(canAskForEdit("viewer")).toBe(true);
    expect(canAskForEdit("commenter")).toBe(true);
    expect(canAskForEdit("editor")).toBe(false);
    expect(canAskForEdit("admin")).toBe(false);
    expect(canAskForEdit("owner")).toBe(false);
    expect(canAskForEdit(null)).toBe(false);
  });
});

describe("the activity door's answer", () => {
  const door = {
    entries: [
      { id: 9, occurred_at: "2026-10-15T10:00:00Z", kind: "record", verb: "edited", title: "Order 12", table_id: "t1", subject_id: "r1", actor: { id: "u1", name: "Maya Ortiz" } },
      { id: 8, occurred_at: "2026-10-15T09:00:00Z", kind: "share", verb: "shared", title: "Sam at viewer", table_id: "t1", subject_id: "t1", actor: { id: "u1", name: "Maya Ortiz" } },
      { id: 7, kind: 5 },
      null,
    ],
    next_before: 7,
  };
  it("keeps well-formed entries, drops the malformed, and carries the page cursor", () => {
    const page = parseActivity(door);
    expect(page.entries.map((e) => e.id)).toEqual([9, 8]);
    expect(page.nextBefore).toBe(7);
  });
  it("says who did what by name, never by id", () => {
    const [edit, share] = parseActivity(door).entries;
    expect(activitySentence(edit)).toBe("Maya Ortiz edited a record — Order 12");
    expect(activitySentence(share)).toBe("Maya Ortiz shared with Sam at viewer");
  });
  it("an empty or foreign answer is an empty page, not a crash", () => {
    expect(parseActivity(null)).toEqual({ entries: [], nextBefore: null });
    expect(parseActivity("nope")).toEqual({ entries: [], nextBefore: null });
  });
});
