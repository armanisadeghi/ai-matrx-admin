import { conductorOfferVariables } from "../offerVariables";
import { rulebookOfferFacts } from "../../agent-context/rulebookDocument";
import type { Rulebook, RulebookRule } from "../../types";

function rule(p: Partial<RulebookRule> & { id: string; name: string }): RulebookRule {
  return { statement: "s", severity: "major", ...p } as RulebookRule;
}

const RULEBOOK = {
  id: "rb1",
  name: "Pallet grading",
  description: "How we grade pallets",
  status: "active",
  version: 4,
  rules: [
    rule({ id: "r1", name: "Weigh first", rejected: true, feedback: "too strict" }),
    rule({ id: "r2", name: "Check corners", feedback: "add an example" }),
    rule({ id: "r3", name: "Old one", retired: true, feedback: "ignore" }),
    rule({ id: "r4", name: "Clean one" }),
  ],
  sections: {},
  source: {},
} as unknown as Rulebook;

describe("rulebookOfferFacts", () => {
  it("reads name/status/version/counts and lists only open reviews", () => {
    const f = rulebookOfferFacts(RULEBOOK);
    expect(f).toMatchObject({
      rulebook_name: "Pallet grading",
      rulebook_status: "active",
      rulebook_version: 4,
      rule_count: 4,
      open_review_count: 2,
    });
    expect(f.open_feedback).toContain("Weigh first");
    expect(f.open_feedback).toContain("(rejected): too strict");
    expect(f.open_feedback).toContain("(change requested): add an example");
    expect(f.open_feedback).not.toContain("Old one");
  });

  it("omits open_feedback when nothing is open", () => {
    const f = rulebookOfferFacts({ ...RULEBOOK, rules: [] } as Rulebook);
    expect("open_feedback" in f).toBe(false);
    expect(f.open_review_count).toBe(0);
  });
});

describe("conductorOfferVariables", () => {
  it("carries the three guaranteed values plus the offered names", () => {
    const v = conductorOfferVariables("rb1", "DOC", rulebookOfferFacts(RULEBOOK), [
      { entityToken: "rulebook", id: "rb1", name: "Pallet grading" },
    ]);
    expect(v).toMatchObject({
      rulebook_name: "Pallet grading",
      attachment_names: ["Pallet grading"],
      rulebook_status: "active",
      rulebook_version: 4,
      rule_count: 4,
      is_resumed_session: false,
    });
    expect(v.rulebook_id).toBe("rb1");
    expect(v.rulebook_document).toBe("DOC");
    expect(JSON.parse(v.attachments as string)).toEqual([
      { entity_token: "rulebook", id: "rb1", name: "Pallet grading" },
    ]);
  });

  it("sends nothing about the Rulebook it has not loaded", () => {
    const v = conductorOfferVariables("rb1", "", null, []);
    expect(v).toEqual({
      rulebook_id: "rb1",
      attachments: "[]",
      rulebook_document: "",
      is_resumed_session: false,
    });
  });
});
