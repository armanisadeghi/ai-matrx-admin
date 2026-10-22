/**
 * CD-PAGE-12 — a client searches her own portal. Real use case: a property manager looks for her gate-code job on
 * Rincon Plumbing's portal. The owner keeps "internal margin" off the portal; it is still in the document (only a
 * masked field arrives NULL), so a search that read the document's keys would find a row by a value she never sees.
 */
import { portalRecordMatches, portalSearchTerms } from "../search";

const job = {
  title: "Replace water heater",
  stage: "scheduled",
  building: { id: "b6f9b1f2-7f6c-4a7f-9b1e-0d2b6a3f1c11", label: "Mesa Verde Apartments" },
  internal_margin: "Quoted 38 percent markup",
  _hidden: { cost_basis: "confidential" },
};
const shown = ["title", "stage", "building"];

describe("a portal search finds only what she is shown (CD-PAGE-12)", () => {
  it("finds her row by a shown field, every word, any case", () => {
    expect(portalRecordMatches(job, shown, portalSearchTerms("water HEATER"))).toBe(true);
    expect(portalRecordMatches(job, shown, portalSearchTerms("mesa verde"))).toBe(true);
  });
  it("never finds a row by a field the portal does not show", () => {
    expect(portalRecordMatches(job, shown, portalSearchTerms("markup"))).toBe(false);
    expect(portalRecordMatches(job, shown, portalSearchTerms("confidential"))).toBe(false);
  });
  it("never finds a row by a link's id, only by its words", () => {
    expect(portalRecordMatches(job, shown, portalSearchTerms("b6f9b1f2"))).toBe(false);
  });
  it("an empty search keeps every row, and a word that is nowhere keeps none", () => {
    expect(portalRecordMatches(job, shown, portalSearchTerms("   "))).toBe(true);
    expect(portalRecordMatches(job, shown, portalSearchTerms("boiler"))).toBe(false);
  });
});
