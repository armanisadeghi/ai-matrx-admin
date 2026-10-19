// An archived table is FOUND by custom.where_id_opens (live: false) but does not open. The server drew its
// full frame while the browser drew a refusal (Investors / Rounds at 192 → 163 px, DB-BLOCK-CHROME-3).
// One decision now: both the seed (expectedNotes) and DataMount draw the archived note.
import { readObjectOrganizationAnswer } from "@ai-matrx/records/door-call";

import { opensNoteLine, opensStateOf } from "../opens-note";

const answer = (live: boolean) =>
  readObjectOrganizationAnswer(
    { data: { kind: "table", organization_id: "00000000-0000-4000-8000-000000000001", path: "/data/x", live, resolved_id: "x" }, error: null },
    "x",
  );

describe("an archived table draws its note on both sides", () => {
  it("a live table opens", () => {
    expect(opensStateOf(answer(true))).toBe("found");
    expect(opensNoteLine(opensStateOf(answer(true)))).toBeNull();
  });
  it("an archived table is not opened: it draws the archived note", () => {
    expect(opensStateOf(answer(false))).toBe("archived");
    expect(opensNoteLine(opensStateOf(answer(false)))).toBe("This database is archived.");
  });
  it("the other states pass through", () => {
    expect(opensStateOf({ state: "not-given" })).toBe("not-given");
    expect(opensStateOf({ state: "resolving" })).toBe("resolving");
  });
});
