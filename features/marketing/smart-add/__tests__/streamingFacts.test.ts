import { ratchetFacts, streamingFacts } from "../streamingFacts";

const env = (facts: unknown[]) => ({ kind: "brand_basics", value: { __kind: "brand_basics", facts } });
const phone = { field: "phone", field_label: "Phone", value: "+1 503 555 0100", certainty: "likely" };
const half = { field: "address", value: "123 Ma" };
const full = { field: "address", value: "123 Main St, Portland OR" };

describe("streamingFacts (MKT-085)", () => {
  it("holds back the last entry while the step is still writing", () => {
    expect(streamingFacts(env([phone, half]), true).map((f) => f.value)).toEqual([phone.value]);
  });
  it("takes every entry once the step settles", () => {
    expect(streamingFacts(env([phone, full]), false).map((f) => f.value)).toEqual([phone.value, full.value]);
  });
  it("ignores another kind and a missing envelope", () => {
    expect(streamingFacts(null, true)).toEqual([]);
    expect(streamingFacts({ kind: "other", value: { facts: [phone] } }, false)).toEqual([]);
  });
  it("ratchet only adds: a fact shown mid-stream stays when a later read lacks it", () => {
    const shown = streamingFacts(env([phone, half]), true);
    const later = ratchetFacts(shown, streamingFacts(env([full]), false));
    expect(later.map((f) => f.value)).toEqual([phone.value, full.value]);
    expect(ratchetFacts(later, [])).toBe(later);
    expect(ratchetFacts(later, streamingFacts(env([phone]), false))).toBe(later);
  });
});
