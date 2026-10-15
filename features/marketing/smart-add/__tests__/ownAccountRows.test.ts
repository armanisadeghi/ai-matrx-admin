/**
 * MKT-045: a social-platform page is an account question, never an "On the web" row.
 * The reviewer's case: Facebook @PickleballSuperstore confirmed in round 1; its own profile still showed as a web
 * row pre-marked "Not us", and another Facebook page showed as a web row pre-marked "Review site".
 */
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { mergeEvidence, parseEvidenceItem, type Decision, type EvidenceItem } from "../evidence";
import { webProfileAsAccount, withoutOwnAccountRows } from "../ownAccountRows";
import { suggestKind } from "../webKinds";

const web = (url: string, field: "web_page" | "listing" | "mention" = "web_page"): EvidenceItem =>
  parseEvidenceItem({
    key: `web:${url}`,
    field,
    value: url,
    url,
    label: "Pickleball Superstore | Facebook",
    source: { node: "web", kind: "web_search", url, where: "web result 2" },
    confidence: 0.4,
  }) as EvidenceItem;

const account = (url: string, handle: string): EvidenceItem =>
  parseEvidenceItem({
    key: `social:facebook:${handle.toLowerCase()}`,
    field: "social",
    value: url,
    url,
    platform: "facebook",
    handle,
    label: "Pickleball Superstore",
    source: { node: "site", kind: "website", url: "https://example.com", where: "the website" },
    confidence: 0.9,
  }) as EvidenceItem;

const OURS = account("https://www.facebook.com/PickleballSuperstore", "PickleballSuperstore");

describe("a social profile found as a web row is an account candidate", () => {
  it("becomes social:<platform>:<handle>", () => {
    const row = webProfileAsAccount(web("https://www.facebook.com/pickleballsuperstoer.ca"));
    expect(row.field).toBe("social");
    expect(row.key).toBe("social:facebook:pickleballsuperstoer.ca");
    expect(row.platform).toBe("facebook");
  });
  it("merges into the account already found, so no second card", () => {
    const items = mergeEvidence(new Map([[OURS.key, OURS]]), [web("https://facebook.com/PickleballSuperstore/")]);
    expect([...items.values()].filter((i) => i.field !== "social")).toEqual([]);
    expect(items.size).toBe(1);
  });
  it("a post stays a web row; a LinkedIn /in/ page stays a person row", () => {
    expect(webProfileAsAccount(web("https://www.facebook.com/PickleballSuperstore/posts/123")).field).toBe("web_page");
    expect(webProfileAsAccount(web("https://www.linkedin.com/in/jane-doe")).field).toBe("web_page");
  });
});

describe("a confirmed account's profile and pages leave the web rows, whatever the order", () => {
  const rows = [
    web("https://m.facebook.com/PickleballSuperstore"),
    web("https://www.facebook.com/PickleballSuperstore/photos/a.1/2"),
    web("https://www.facebook.com/PickleballSuperstore/posts/123"),
    web("https://news.example.org/pickleball-superstore-opens"),
  ];
  it("before the account is confirmed, the rows are kept", () => {
    expect(withoutOwnAccountRows([OURS, ...rows], {})).toHaveLength(5);
  });
  it("once it is confirmed, only the unrelated page is left beside the account", () => {
    const decisions: Record<string, Decision> = { [OURS.key]: "yes" };
    const left = withoutOwnAccountRows([OURS, ...rows], decisions).map((i) => i.url);
    expect(left).toEqual([OURS.url, "https://news.example.org/pickleball-superstore-opens"]);
  });
});

describe("a social-platform page is never a Review site", () => {
  const kinds: BrandRelationKind[] = ["ours", "review_site", "claimable_listing", "mention", "not_us"].map((key) => ({
    id: key,
    key,
    label: key,
    routesTo: null,
    isKnown: true,
    stance: "about_us",
    description: null,
    hasSentiment: false,
    match: { hosts: key === "review_site" ? ["facebook.com"] : [], paths: [], categories: [] },
  })) as BrandRelationKind[];
  it("a listing row on facebook.com gets no review/listing suggestion", () => {
    const s = suggestKind(web("https://www.facebook.com/groups/123/posts/9", "listing"), kinds, {
      ourHosts: ["pickleballsuperstore.com"],
      ourAccounts: [],
      name: "Pickleball Superstore",
    });
    expect(["review_site", "claimable_listing"]).not.toContain(s?.kind);
  });
});
