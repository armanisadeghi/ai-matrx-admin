import { compareRows, evidenceFromPayload, mergeEvidence, type EvidenceItem } from "../evidence";
import fixture from "./fixtures/resolved_accounts.json";

// Server emissions for fullspecstaff.com: the bare links the site names, then the looked-up accounts
// (real recorded provider answers run through the real normalizers; see aidream
// tests/test_brand_identify_resolves_accounts.py).
function rowsFor(list: unknown[]) {
  const merged = mergeEvidence(new Map<string, EvidenceItem>(), evidenceFromPayload({ brand_evidence: list }));
  return compareRows([...merged.values()]);
}

describe("resolved accounts", () => {
  it("before lookup: the LinkedIn numeric link and the vanity link are two bare rows", () => {
    const li = rowsFor(fixture.before).find((r) => r.platform === "linkedin");
    expect(li?.candidates.map((c) => c.handle).sort()).toEqual(["17891469", "full-spectrum-search-group"]);
  });

  it("after lookup: numeric and vanity LinkedIn links are ONE company row with its real name", () => {
    const li = rowsFor(fixture.after).find((r) => r.platform === "linkedin");
    expect(li?.candidates).toHaveLength(1);
    const c = li!.candidates[0];
    expect(c.name).toBe("Full Spectrum Search Group");
    expect(c.handle).toBe("full-spectrum-search-group");
    expect(c.followers).toBe(5233);
    // A rejection of the row reaches the bare numeric link too.
    expect(c.ownKeys).toContain("social:linkedin:17891469");
  });

  it("after lookup: the /channel/UC… link is the channel's @handle row with name and subscribers", () => {
    const yt = rowsFor(fixture.after).find((r) => r.platform === "youtube");
    expect(yt?.candidates).toHaveLength(1);
    const c = yt!.candidates[0];
    expect(c.name).toBe("MrBeast");
    expect(c.handle).toBe("MrBeast");
    expect(c.followers).toBe(520_000_000);
  });
});
