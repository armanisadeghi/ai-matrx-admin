// MKT-118: two copies of one fact, each fuller in a different way (the live stream has the longer reason, the step's
// output has more evidence), must merge to ONE settled fact. "Take the fuller copy" swapped them on every merge, so
// Smart Add's render-time ratchet and its onFacts merge never settled: "Too many re-renders" / "Maximum update depth".
import { ratchetFacts, streamingFacts } from "../streamingFacts";
import { factsFromPayload, mergeFacts } from "../validate/queue";

const fact = (reason: string, evidence_urls: string[]) => ({
  __kind: "brand_basics_fact",
  field: "phone",
  field_label: "Phone",
  value: "+1 937 555 0100",
  certainty: "likely",
  reason,
  evidence_urls,
});
const live = { kind: "brand_basics", value: { __kind: "brand_basics", facts: [fact("Footer of the site, beside the hours", ["https://a.b"])] } };
const output = { brand_basics: { __kind: "brand_basics", facts: [fact("Footer", ["https://a.b", "https://c.d", "https://e.f"])] } };

/** The facts step's render: the same render-time ratchet SmartAddRound's StepWatch runs, bounded like React's 25. */
function renderUntilSettled(): { renders: number; facts: ReturnType<typeof ratchetFacts> } {
  let shown: ReturnType<typeof ratchetFacts> = [];
  for (let renders = 1; renders <= 25; renders += 1) {
    const next = ratchetFacts(ratchetFacts(shown, streamingFacts(live, false)), factsFromPayload(output));
    if (next === shown) return { renders, facts: shown };
    shown = next;
  }
  throw new Error("Too many re-renders: the facts ratchet never settled");
}

describe("fact merges settle (MKT-118)", () => {
  it("the render-time ratchet settles when the stream and the output are each fuller in a different way", () => {
    const { renders, facts } = renderUntilSettled();
    expect(renders).toBeLessThanOrEqual(3);
    expect(facts).toHaveLength(1);
    expect(facts[0].reason).toBe("Footer of the site, beside the hours");
    expect(facts[0].evidence_urls).toEqual(["https://a.b", "https://c.d", "https://e.f"]);
  });

  it("onFacts' merge returns the same array when the same crossing copies arrive again", () => {
    const incoming = [...streamingFacts(live, false), ...factsFromPayload(output)];
    const once = mergeFacts([], incoming);
    expect(mergeFacts(once, incoming)).toBe(once);
    expect(once).toHaveLength(1);
  });

  it("a copy that adds nothing never replaces the shown one", () => {
    const shown = ratchetFacts([], factsFromPayload(output));
    expect(ratchetFacts(shown, factsFromPayload(output))).toBe(shown);
  });
});
