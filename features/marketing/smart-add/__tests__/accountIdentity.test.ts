import { collapseAliasedAccounts, compareRows, evidenceFromPayload, mergeEvidence, type EvidenceItem } from "../evidence";

// Recorded live on 2026-10-14 (run e6b0140b, fullspecstaff.com): the brand's Linktree links
// linkedin.com/company/17891469/admin/, the site links /company/full-spectrum-search-group, and the
// screen showed BOTH as "Full Spectrum Search Group · 5,232 followers" rows. The emissions arrive one by
// one, in this order; the looked-up row learned its alias only after it was already on screen.
const PROFILE = "8c1f1e0e-7a51-4b61-9a43-2f7d0c3b9d11";
const vanity = "https://www.linkedin.com/company/full-spectrum-search-group";
const looked = {
  field: "social", platform: "linkedin", value: vanity, url: vanity, label: "Full Spectrum Search Group",
  followers: 5232, profile_id: PROFILE, confidence: 0.97,
  source: { node: "avatars", kind: "social_profile", url: vanity, where: "linkedin profile" },
};
const bareFromLinktree = {
  key: "social:linkedin:17891469", field: "social", platform: "linkedin", handle: "17891469",
  value: "https://www.linkedin.com/company/17891469", url: "https://www.linkedin.com/company/17891469",
  confidence: 0.85, source: { node: "avatars", kind: "link_in_bio", url: "https://linktr.ee/fullspecstaff", where: "link" },
};
const canonicalNoAlias = { ...looked, key: "social:linkedin:full-spectrum-search-group", handle: "full-spectrum-search-group", same_as: [] };
const canonicalWithAlias = { ...canonicalNoAlias, same_as: ["social:linkedin:17891469"] };
const aliasCopy = { ...looked, key: "social:linkedin:17891469", handle: "17891469", same_as: [] };

function screen(...emissions: unknown[][]) {
  let items = new Map<string, EvidenceItem>();
  for (const list of emissions) items = mergeEvidence(items, evidenceFromPayload({ brand_evidence: list }));
  return [...items.values()];
}

function linkedinHandles(items: EvidenceItem[]) {
  return compareRows(items).find((r) => r.platform === "linkedin")?.candidates.map((c) => c.handle) ?? [];
}

describe("one real account = one row, whatever order its identities arrive in", () => {
  it("the recorded order (bare link, looked-up row, then the alias copy) shows ONE LinkedIn row", () => {
    const items = screen([bareFromLinktree], [canonicalNoAlias], [aliasCopy], [canonicalWithAlias, aliasCopy]);
    expect(linkedinHandles(items)).toEqual(["full-spectrum-search-group"]);
    expect(collapseAliasedAccounts(items.filter((i) => i.field === "social")).map((i) => i.handle)).toEqual(["full-spectrum-search-group"]);
  });

  it("the alias copy alone (same stored profile, no same_as yet) still folds into the account", () => {
    const items = screen([canonicalNoAlias], [aliasCopy]);
    expect(linkedinHandles(items)).toEqual(["full-spectrum-search-group"]);
    const row = compareRows(items).find((r) => r.platform === "linkedin")!.candidates[0];
    expect(row.ownKeys).toContain("social:linkedin:17891469");
  });

  it("a re-sent row with the same confidence keeps the links it IS (same_as only grows)", () => {
    const items = screen([bareFromLinktree], [canonicalNoAlias], [canonicalWithAlias]);
    expect(items.find((i) => i.key === canonicalNoAlias.key)?.same_as).toEqual(["social:linkedin:17891469"]);
    expect(linkedinHandles(items)).toEqual(["full-spectrum-search-group"]);
  });
});
