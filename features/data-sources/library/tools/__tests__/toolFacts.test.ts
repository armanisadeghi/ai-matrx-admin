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
    expect(speedText(800)).toBe("~800ms");
    expect(speedText(12_400)).toBe("~12s");
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

import { dedupeByJob, memberSummary } from "../toolFacts";

describe("members never read internal notes", () => {
  const raw = "What people say about a place, newest first. Last live test hit a sign-in wall.";
  it("cuts the note and flags the Tool", () => {
    expect(memberSummary(raw)).toEqual({ text: "What people say about a place, newest first.", flagged: true });
  });
  it("an admin sees it raw", () => {
    expect(memberSummary(raw, true)).toEqual({ text: raw, flagged: false });
  });
  it("a clean summary passes untouched", () => {
    expect(memberSummary("Who works at a company.")).toEqual({ text: "Who works at a company.", flagged: false });
  });
  it("lists one row per job", () => {
    expect(dedupeByJob([{ job_key: "a" }, { job_key: "a" }, { job_key: "b" }])).toHaveLength(2);
    expect(dedupeByJob([{ job_key: "a", display_name: "Maps reviews" }, { job_key: "b", display_name: "maps reviews" }])).toHaveLength(1);
  });
  it("cuts a blocked-on-our-account note", () => {
    expect(memberSummary("Reviews for a business; blocked on our account's last live test.")).toEqual({ text: "", flagged: true });
  });
});
