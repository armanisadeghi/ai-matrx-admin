import { nameSearchRows, parseNameStrength } from "../nameStrength";
import { nameAnchors } from "../evidence";

// The stored shape aidream's brand.identify.web_deep writes for a handle whose profile shows only "Sarah".
const weakDeep = {
  skipped: true,
  name_strength: {
    verdict: { name: "Sarah", cleaned: "Sarah", kind: "display_name", strength: "weak", reasons: ["one word, a common first name (rank 146)"], words: ["Sarah"] },
    keyword: { term: null, name_alone: false, anchor: null, anchor_value: null, why: "weak name and no anchor: not searched alone" },
    rules_source: "default",
    full_name_asked: true,
  },
  queries: [],
};
const anchoredWeb = {
  name_strength: {
    verdict: { name: "Sarah", cleaned: "Sarah", kind: "display_name", strength: "weak", reasons: ["one word"], words: ["Sarah"] },
    keyword: { term: '"sarahs_day"', name_alone: false, anchor: "handle", anchor_value: "sarahs_day", why: "weak name: the handle leads" },
    full_name_asked: false,
  },
  queries: ['"sarahsday.com"', '"sarahs_day"', '"sarahs_day" reviews'],
};

describe("name strength (Report 2026-10-15)", () => {
  it("reads the verdict and asks for a full name only when nothing anchors a weak name", () => {
    expect(parseNameStrength(weakDeep)).toMatchObject({ strength: "weak", kind: "display_name", term: null, fullNameAsked: true });
    expect(parseNameStrength(anchoredWeb)).toMatchObject({ term: '"sarahs_day"', anchor: "handle", fullNameAsked: false });
    expect(parseNameStrength({ queries: ['"x"'] })).toBeNull();
  });

  it("lists every name search step with the keywords it sent", () => {
    const rows = nameSearchRows([
      { nodeId: "web", output: anchoredWeb },
      { nodeId: "deep", output: weakDeep },
      { nodeId: "probe", output: {} },
    ]);
    expect(rows.map((r) => [r.step, r.queries])).toEqual([
      ["web", ['"sarahsday.com"', '"sarahs_day"', '"sarahs_day" reviews']],
      ["deep", []],
    ]);
    // The weak name never appears alone as a keyword.
    expect(rows.flatMap((r) => r.queries)).not.toContain('"Sarah"');
  });

  it("sends the confirmed handles and addresses as anchors", () => {
    expect(nameAnchors([{ handle: "@sarahs_day", url: "https://instagram.com/sarahs_day", value: "x" }], ["https://sarahsday.com"])).toEqual({
      handles: ["sarahs_day"],
      links: ["https://instagram.com/sarahs_day", "https://sarahsday.com"],
    });
    expect(nameAnchors([], [])).toEqual({});
  });
});
