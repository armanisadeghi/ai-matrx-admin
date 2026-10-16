import { readFileSync } from "node:fs";
import { join } from "node:path";
const mockGetJson = jest.fn();
jest.mock("@/lib/python-client", () => ({ getJson: (...args: unknown[]) => mockGetJson(...args) }));

import { factKindFor, loadFactRules, profileHomeFor, toFactRules } from "../factRules";
import rulesSample from "./fixtures/fact_rules.json";

const here = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");
const rules = toFactRules(rulesSample);

describe("Smart Add files facts by the server's rules, and keeps no copy of them", () => {
  it("every recurring label that sat under 'other' has a real kind", () => {
    const expected: Record<string, string> = {
      technology_used: "technology",
      sic_code: "industry_code",
      naics_code: "industry_code",
      year_founded: "founded",
      social_follower_count: "metric",
      city: "location",
      founder: "person",
      website: "website",
      toll_free_phone: "phone",
      phone: "phone",
      certification: "proof",
    };
    for (const [field, kind] of Object.entries(expected)) expect(factKindFor(field, rules)).toBe(kind);
    expect(factKindFor("a_field_nobody_mapped", rules)).toBe("other");
    expect(factKindFor("other", rules)).toBe("other");
  });

  it("a profile-home field has no business fact", () => {
    expect(profileHomeFor("competitor", rules)).toBe("competitors");
    expect(profileHomeFor("Also_Known_As", rules)).toBe("brand_aliases");
    expect(profileHomeFor("phone", rules)).toBeNull();
  });

  it("an unknown profile key from the server is dropped, never guessed", () => {
    const r = toFactRules({ fact_kinds: [], field_kind: {}, profile_home: { x: "somewhere_new", competitor: "competitors" } });
    expect(r.profileHome).toEqual({ competitor: "competitors" });
  });

  it("reads the rules from the server once and retries after a failure", async () => {
    mockGetJson.mockRejectedValueOnce(new Error("down")).mockResolvedValue({ data: rulesSample });
    await expect(loadFactRules()).rejects.toThrow("down");
    const a = await loadFactRules();
    const b = await loadFactRules();
    expect(a).toBe(b);
    expect(mockGetJson).toHaveBeenCalledTimes(2);
    expect(mockGetJson).toHaveBeenCalledWith("/brand-intake/promote/rules");
  });

  it("no client file keeps its own field-to-kind or profile-home table", () => {
    for (const file of ["keptFacts.ts", "validate/persist.ts"]) {
      const src = here(file);
      expect(src).not.toMatch(/toll_free_phone\s*:/);
      expect(src).not.toMatch(/also_known_as\s*:/);
      expect(src).not.toMatch(/const (FIELD_KIND|FACT_FIELD_KIND|PROFILE_HOME)\b/);
    }
  });
});
