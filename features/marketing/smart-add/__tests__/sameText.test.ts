import { withoutNonContactEmails, withoutRepeatedText, type EvidenceItem } from "../evidence";
import { categoriesFor, type KnownDomainRule } from "@/lib/web-domains/registry";

const row = (key: string, field: EvidenceItem["field"], value: string, confidence = 0.6): EvidenceItem => ({
  key, field, value, label: null, image_url: null, url: null, platform: null, handle: null, followers: null, verified: null,
  profile_id: null, source: { node: "page", kind: "website", url: null, where: "page" }, confidence,
});

// MKT-083 (reviewer, 2026-10-15): About showed one description twice — the server keys an About by a hash of its
// text, the first-data feed by the text itself, so the same words arrived under two keys.
describe("withoutRepeatedText", () => {
  const ABOUT = "Small-batch ice cream made in San Diego with local milk & seasonal fruit, scooped daily since 2015.";
  it("one About row for the same words from two sources", () => {
    const out = withoutRepeatedText([
      row("description:3fa1b2c4d5e6", "description", ABOUT, 0.8),
      row(`description:${ABOUT.toLowerCase().slice(0, 80)}`, "description", ABOUT.replace("&", "&amp;") + " ", 0.6),
      row("phone:6195550100", "phone", "(619) 555-0100"),
    ], {});
    expect(out.map((i) => i.key)).toEqual(["description:3fa1b2c4d5e6", "phone:6195550100"]);
  });
  it("a listing cut short (…) folds into the full text; the answered row always stays", () => {
    const cut = row("description:cut", "description", `${ABOUT.slice(0, 60)}…`, 0.9);
    const full = row("description:full", "description", ABOUT, 0.5);
    expect(withoutRepeatedText([cut, full], {}).map((i) => i.key)).toEqual(["description:full"]);
    expect(withoutRepeatedText([cut, full], { "description:cut": "preferred" }).map((i) => i.key)).toEqual(["description:cut"]);
  });
  it("different texts and different slots stay", () => {
    const out = withoutRepeatedText([row("tagline:a", "tagline", "Scoop happy"), row("description:b", "description", ABOUT), row("name:a", "name", "Scoop happy")], {});
    expect(out).toHaveLength(3);
  });
});

// MKT-082 (reviewer, 2026-10-15): Contact listed …@sentry-next.wixpress.com and …@sentry.io ahead of the real emails.
describe("withoutNonContactEmails", () => {
  const rules: KnownDomainRule[] = [
    { host: "sentry.io", pathPattern: "", category: "non_contact_mail", provenance: "seeded", confidence: 1, label: "Sentry" },
    { host: "wixpress.com", pathPattern: "", category: "non_contact_mail", provenance: "seeded", confidence: 1, label: "Wix internal" },
  ];
  const isNonContact = (host: string) => categoriesFor(host, rules).includes("non_contact_mail");
  it("drops tracker and site-builder addresses, keeps the brand's", () => {
    const out = withoutNonContactEmails([
      row("email:a", "email", "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com"),
      row("email:b", "email", "c183baa23f7a4e4c8f5b8ed1c35f5cb3@sentry.io"),
      row("email:c", "email", "hello@scoopshop.com"),
      row("phone:1", "phone", "6195550100"),
    ], isNonContact);
    expect(out.map((i) => i.key)).toEqual(["email:c", "phone:1"]);
  });
});
