import type { EvidenceItem } from "../evidence";
import { knownDecided, suggestionsFromPayload, withSuggestions } from "../weThink";

const item = (key: string, field: EvidenceItem["field"], value: string, extra: Partial<EvidenceItem> = {}): EvidenceItem =>
  ({ key, field, value, source: { kind: "website", where: "homepage link" }, confidence: 0.9, ...extra }) as EvidenceItem;

// The `we_think` step's output as the run records it: an agent_result whose content holds the brand_we_think kind.
const STEP_OUTPUT = {
  __kind: "agent_result",
  content: [
    {
      __kind: "brand_we_think",
      suggestions: [
        { key: "social:instagram:fullspecstaff", choice: "ours", relation_key: null, probability: 0.95, reason: "Links fullspecstaff.com", evidence: ["link in bio"] },
        { key: "name:full spectrum search group", choice: "ours", relation_key: null, probability: 0.9, reason: "Official name", evidence: [] },
        { key: "social:x:fullspectrum", choice: "related", relation_key: "competitor", probability: 0.6, reason: "Another firm", evidence: [] },
        { key: "social:facebook:other", choice: "ask_later", relation_key: "founder", probability: 0.5, reason: "Same name only", evidence: [] },
        { key: "bad", choice: "maybe", probability: 1, reason: "" },
      ],
    },
  ],
};

describe("we think", () => {
  it("reads every suggestion from a step output, maps ask_later to Ask me later, keeps relation_key only for related", () => {
    const s = suggestionsFromPayload(STEP_OUTPUT);
    expect(Object.keys(s).sort()).toEqual(
      ["name:full spectrum search group", "social:facebook:other", "social:instagram:fullspecstaff", "social:x:fullspectrum"].sort(),
    );
    expect(s["social:facebook:other"]).toMatchObject({ choice: "later", relation_key: null });
    expect(s["social:x:fullspectrum"]).toMatchObject({ choice: "related", relation_key: "competitor", probability: 0.6 });
  });

  it("puts each suggestion on its finding as the option that card offers, and leaves the rest untouched", () => {
    const items = [
      item("social:instagram:fullspecstaff", "social", "https://www.instagram.com/fullspecstaff/"),
      item("name:full spectrum search group", "name", "Full Spectrum Search Group"),
      item("website:other.com", "website", "other.com"),
    ];
    const out = withSuggestions(items, suggestionsFromPayload(STEP_OUTPUT));
    expect((out[0].suggestion as { choice: string }).choice).toBe("ours");
    expect((out[1].suggestion as { choice: string }).choice).toBe("preferred");
    expect(out[2]).toBe(items[2]);
  });

  it("sends what is already ours and not us, never an unanswered finding", () => {
    const items = [
      item("website:fullspecstaff.com", "website", "https://fullspecstaff.com/"),
      item("social:instagram:fullspecstaff", "social", "fullspecstaff", { url: "https://www.instagram.com/fullspecstaff/" }),
      item("social:facebook:other", "social", "other", { url: "https://facebook.com/other" }),
      item("name:fssg", "name", "FSSG"),
      item("name:open", "name", "Open"),
    ];
    expect(
      knownDecided(items, {
        "website:fullspecstaff.com": "preferred",
        "social:instagram:fullspecstaff": "yes",
        "social:facebook:other": "no",
        "name:fssg": "alias",
      }),
    ).toEqual({
      websites: ["fullspecstaff.com"],
      accounts: ["https://www.instagram.com/fullspecstaff/"],
      names: [],
      aliases: ["FSSG"],
      exclusions: ["https://facebook.com/other"],
    });
  });

  it("MKT-064: a suggestion whose key the agent decoded (or recased) still lands on its card", () => {
    const out = withSuggestions(
      [item("social:youtube:vivaespa%c3%b1a-1m", "social", "https://www.youtube.com/@vivaespa%C3%B1a-1m")],
      suggestionsFromPayload({ __kind: "brand_we_think", suggestions: [
        { key: "social:youtube:VivaEspaña-1m", choice: "ours", relation_key: null, probability: 0.9, reason: "Links the site", evidence: [] },
      ] }),
    );
    expect((out[0].suggestion as { choice: string }).choice).toBe("ours");
  });
});
