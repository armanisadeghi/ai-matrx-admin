// Staff are KEY PEOPLE, never the brand (Arman, 2026-10-14): a business's site linked its team's LinkedIn
// /in/ profiles, and their names ("Gaston Wilder") landed as brand names and their photos as logos.
// Proven failing: drop the person-only check, or filter a personal brand's own profile.
import type { EvidenceItem } from "../evidence";
import { isStaffAccount, isStaffFact, withoutStaffFacts } from "../staff";

const src = (url: string) => ({ node: "n", kind: "social_profile" as const, url, where: "linkedin profile" });
const item = (field: string, value: string, url: string, extra: Partial<EvidenceItem> = {}) =>
  ({ key: `${field}:${value}`, field, value, source: src(url), confidence: 0.85, ...extra }) as unknown as EvidenceItem;

const staffUrl = "https://www.linkedin.com/in/gaston-wilder";
const companyUrl = "https://www.linkedin.com/company/acme";

describe("staff profiles on a business", () => {
  const name = item("name", "Gaston Wilder", staffUrl);
  const photo = item("logo", "https://media.licdn.com/p.jpg", staffUrl);
  const account = item("social", staffUrl, staffUrl, { url: staffUrl, platform: "linkedin" });
  const companyName = item("name", "Acme", companyUrl);

  it("keeps a staff member's name and photo out of the brand's slots, and keeps the company's", () => {
    expect(withoutStaffFacts([name, photo, account, companyName], false).map((i) => i.key)).toEqual([account.key, companyName.key]);
    expect(isStaffFact(name, false)).toBe(true);
    expect(isStaffAccount(account, false)).toBe(true);
    expect(isStaffAccount(item("social", companyUrl, companyUrl, { url: companyUrl }), false)).toBe(false);
  });

  it("filters nothing for a personal brand: their own profile is them", () => {
    expect(withoutStaffFacts([name, photo, account], true)).toHaveLength(3);
    expect(isStaffAccount(account, true)).toBe(false);
  });
});
