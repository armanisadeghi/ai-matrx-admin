import { defaultUserPreferences } from "../defaultUserPreferences";
import { MAX_PREFERENCE_SECTION_BYTES, oversizedPreferenceSections } from "../preferenceSectionSize";

describe("preferences stay settings, not feature working data", () => {
  it("every default section is under the first-paint budget", () => {
    expect(oversizedPreferenceSections(defaultUserPreferences as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("flags a seeded row whose section carries working data (this is what Smart Add's 50 KB did)", () => {
    const seeded = { ...defaultUserPreferences, someFeature: { runs: { a: { blob: "x".repeat(MAX_PREFERENCE_SECTION_BYTES) } } } };
    const hits = oversizedPreferenceSections(seeded as unknown as Record<string, unknown>);
    expect(hits.map((h) => h.section)).toEqual(["someFeature"]);
  });

  it("no module declares itself persisted without being small by default (smartAdd is gone)", () => {
    expect(Object.keys(defaultUserPreferences)).not.toContain("smartAdd");
  });
});
