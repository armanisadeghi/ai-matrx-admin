import { inputsToSend, jobFamilyOf, reliabilityFacts, speedText, verdictLine } from "../toolFacts";

describe("reliabilityFacts", () => {
  it("states a rate only with enough runs behind it", () => {
    expect(reliabilityFacts({ success_rate: 1, samples: 2, p50_ms: null, last_success_at: null })).toMatchObject({ headline: "New", sample: "2 runs" });
    expect(reliabilityFacts({ success_rate: null, samples: 0, p50_ms: null, last_success_at: null })).toMatchObject({ headline: "New", sample: null });
    expect(reliabilityFacts({ success_rate: 0.984, samples: 2140, p50_ms: 800, last_success_at: null })).toEqual({
      headline: "98% worked",
      sample: "2,140 runs",
      tone: "success",
    });
    expect(reliabilityFacts({ success_rate: 0.5, samples: 40, p50_ms: 1, last_success_at: null }).tone).toBe("danger");
  });
});

describe("speedText", () => {
  it("reads like a person", () => {
    expect(speedText(800)).toBe("~0.8 s");
    expect(speedText(12_400)).toBe("~12 s");
    expect(speedText(180_000)).toBe("~3 min");
    expect(speedText(null)).toBeNull();
  });
});

describe("inputsToSend", () => {
  it("drops empties and trims", () => {
    expect(inputsToSend({ domain: "  ahrefs.com ", country: "", tags: [], depth: 0, on: false, none: null })).toEqual({ domain: "ahrefs.com", depth: 0, on: false });
  });
});

describe("job families and verdicts", () => {
  it("names an unknown family honestly", () => {
    expect(jobFamilyOf("seo").label).toBe("SEO & backlinks");
    expect(jobFamilyOf("zzz").label).toBe("Other");
  });
  it("comments only on a near miss", () => {
    expect(verdictLine("closest", "backlinks")).toBe("Nothing matches exactly. These are closest.");
    expect(verdictLine("closest", "")).toBeNull();
    expect(verdictLine("strong", "x")).toBeNull();
  });
});
