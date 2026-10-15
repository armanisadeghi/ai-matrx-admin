import { brandNameFromLive } from "../firstData";
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
  it("MKT-106: releases the last entry once a later key has begun, so a closing Tagline/About fills mid-stream", () => {
    const tagline = { field: "brand_statement", field_label: "Statement", value: "Coffee, roasted with care.", certainty: "confirmed", reason: "Site header.", evidence_urls: [] };
    expect(streamingFacts(env([phone, tagline]), true).map((f) => f.value)).toEqual([phone.value, tagline.value]);
    const writingReason = { field: "brand_statement", value: "Coffee, roasted with care.", certainty: "confirmed", reason: "Site he" };
    expect(streamingFacts(env([phone, writingReason]), true).map((f) => f.value)).toEqual([phone.value]);
  });
  it("MKT-106: a fact released early takes its fuller reason in place", () => {
    const early = streamingFacts(env([{ ...phone, reason: "Foot", evidence_urls: [] }, half]), false).slice(0, 1);
    const later = ratchetFacts(early, streamingFacts(env([{ ...phone, reason: "Footer of the site", evidence_urls: ["https://a.b"] }]), false));
    expect(later).toHaveLength(1);
    expect(later[0].reason).toBe("Footer of the site");
  });
});

describe("brandNameFromLive (MKT-106)", () => {
  const live = (value: Record<string, unknown>, verified = false) => ({ kind: "brand_basics", value, verified });
  it("waits while the name may be half-written, takes it once the facts list has begun", () => {
    expect(brandNameFromLive(live({ brand_name: "Blue Lo" }))).toBeNull();
    expect(brandNameFromLive(live({ brand_name: "Blue Lotus", facts: [] }))).toBe("Blue Lotus");
    expect(brandNameFromLive(live({ brand_name: "Blue Lotus" }, true))).toBe("Blue Lotus");
    expect(brandNameFromLive(null)).toBeNull();
  });
});
