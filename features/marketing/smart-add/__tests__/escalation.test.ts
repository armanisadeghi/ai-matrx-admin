import { autoEscalation, nextPersonRung } from "../harder/escalation";

describe("automatic person-path escalation (Ernest Vining, 2026-10-14)", () => {
  it("all four easy candidates marked Not me steps down to harder", () => {
    expect(autoEscalation("person_easy", ["not_me", "not_me", "namesake", "not_me"], 4)).toEqual({
      from: "person_easy",
      to: "person_harder",
      reason: "every candidate was marked Not me",
    });
  });
  it("nothing to mark steps down too", () => {
    expect(autoEscalation("person_harder", [], 0)?.to).toBe("person_hard");
  });
  it("a partial mark or any 'me' holds the rung", () => {
    expect(autoEscalation("person_easy", ["not_me", null, "not_me"], 3)).toBeNull();
    expect(autoEscalation("person_easy", ["not_me", "me"], 2)).toBeNull();
  });
  it("the bottom rung never escalates", () => {
    expect(nextPersonRung("person_near_impossible")).toBeNull();
    expect(autoEscalation("person_near_impossible", ["not_me"], 1)).toBeNull();
  });
});
