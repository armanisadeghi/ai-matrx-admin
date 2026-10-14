import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareRows, linkPages, parseEvidenceItem, type EvidenceItem } from "../evidence";
import { compareSlots, isSettledWithoutAsking } from "../compare/compareSlots";
import { isLinkInBioUrl, LINK_IN_BIO_SERVICES, linkInBioService } from "../../lib/link-in-bio";

// The stored fullspecstaff.com round (2026-10-14): the typed site, plus the five links its Linktree
// (linktr.ee/fullspecstaff, read off its Instagram profile) shows. The compare asked "Which is yours?"
// between fullspecstaff.com and linktr.ee/fullspecstaff, because every finding read off the Linktree
// made linktr.ee a "site".
const round = (JSON.parse(readFileSync(join(__dirname, "fixtures/fullspecstaff_round.json"), "utf8")) as unknown[])
  .map(parseEvidenceItem)
  .filter((i): i is EvidenceItem => i !== null);
const LINKTREE = "https://linktr.ee/fullspecstaff";
const state = { decisions: {}, relations: {}, skipped: new Set<string>(), person: false, ownSites: ["fullspecstaff.com"] };

const item = (over: Partial<EvidenceItem> & Pick<EvidenceItem, "key" | "field" | "value">): EvidenceItem =>
  parseEvidenceItem({ confidence: 0.8, source: { node: "n", kind: "website", url: "https://fullspecstaff.com" }, ...over })!;

describe("a link-in-bio page is never a website candidate", () => {
  it("fullspecstaff: no website candidate on linktr.ee (the stored round)", () => {
    const sites = compareRows(round).find((r) => r.platform === "website")?.candidates ?? [];
    expect(sites.map((c) => c.url).filter((u) => isLinkInBioUrl(u))).toEqual([]);
    expect(sites.some((c) => /linktr\.ee/.test(c.url ?? ""))).toBe(false);
  });

  it("a website item whose address is a link-in-bio page is not a site either", () => {
    const items = [item({ key: "website:linktr.ee/acme", field: "website", value: "https://linktr.ee/acme" })];
    expect(compareRows(items).find((r) => r.platform === "website")).toBeUndefined();
  });
});

describe("compare never includes a link-in-bio page or something the person typed", () => {
  it("fullspecstaff: no compare slot holds linktr.ee or the typed site", () => {
    const slots = compareSlots(round, state);
    const urls = slots.flatMap((s) => s.candidates.map((c) => c.url ?? c.anchor.value));
    expect(urls.filter((u) => isLinkInBioUrl(u))).toEqual([]);
    expect(urls.some((u) => /\/\/(www\.)?fullspecstaff\.com\/?$/.test(u))).toBe(false);
  });

  it("a typed account is settled; a found one alone is not a comparison", () => {
    const typed = item({ key: "social:instagram:acme", field: "social", platform: "instagram", handle: "acme", value: "https://instagram.com/acme", source: { node: "n", kind: "typed", url: null, where: null } });
    const found = item({ key: "social:instagram:acme_co", field: "social", platform: "instagram", handle: "acme_co", value: "https://instagram.com/acme_co", source: { node: "web", kind: "web_search", url: null, where: null } });
    expect(compareSlots([typed, found], { ...state, ownSites: [] })).toEqual([]);
  });

  it("isSettledWithoutAsking: link pages, bio links and link-in-bio sites", () => {
    const page = item({ key: "link_page:linktr.ee/acme", field: "link_page", value: "https://linktr.ee/acme" });
    const [site] = compareRows([item({ key: "website:acme.com", field: "website", value: "https://acme.com" })])[0].candidates;
    expect(isSettledWithoutAsking({ ...site, anchor: page })).toBe(true);
    expect(isSettledWithoutAsking({ ...site, url: "https://stan.store/acme" })).toBe(true);
    expect(isSettledWithoutAsking(site)).toBe(false);
  });
});

describe("link pages: their own spot, with their links", () => {
  it("fullspecstaff (stored round, no page item yet): the Linktree is their link page, its links under it", () => {
    const pages = linkPages(round);
    const main = pages.find((p) => p.url === LINKTREE);
    expect(main?.service).toBe("Linktree");
    expect(main?.theirs).toBe(true);
    expect(main?.links.map((l) => l.url)).toContain("https://fullspecstaff.com/senior-living-jobs/");
    // The second Linktree it shows is a link page too, not a plain link.
    expect(pages.some((p) => p.url === "https://linktr.ee/fullspecreviews" && p.theirs)).toBe(true);
    expect(main?.links.some((l) => isLinkInBioUrl(l.url))).toBe(false);
  });

  it("the server's link_page item is read, not dropped; a web-found page is theirs only with their handle", () => {
    const own = parseEvidenceItem({ key: "link_page:linktr.ee/acme", field: "link_page", value: "https://linktr.ee/acme", handle: "acme", confidence: 0.9, source: { node: "avatars", kind: "link_in_bio", url: "https://linktr.ee/acme" } });
    const web = parseEvidenceItem({ key: "link_page:stan.store/acme", field: "link_page", value: "https://stan.store/acme", handle: "acme", confidence: 0.4, source: { node: "web", kind: "web_search", url: "https://stan.store/acme" } });
    const stranger = parseEvidenceItem({ key: "link_page:beacons.ai/zed", field: "link_page", value: "https://beacons.ai/zed", handle: "zed", confidence: 0.4, source: { node: "web", kind: "web_search", url: "https://beacons.ai/zed" } });
    expect(own?.field).toBe("link_page");
    const pages = linkPages([own!, web!, stranger!], ["@acme"]);
    expect(pages.map((p) => [p.url, p.theirs])).toEqual([
      ["https://linktr.ee/acme", true],
      ["https://stan.store/acme", true],
      ["https://beacons.ai/zed", false],
    ]);
  });
});

// The canonical list (SPEC.md "Link-in-bio pages are a source"; Arman's list). Mirrors aidream
// tests/test_link_in_bio.py CANONICAL_PROFILES: adding a service = a row there, here, and in both registries.
const CANONICAL_PROFILES: Record<string, string> = {
  Linktree: "https://linktr.ee/fullspecstaff",
  Beacons: "https://beacons.ai/x", "Beacons page": "https://beacons.page/x",
  "Stan Store": "https://stan.store/x", "Stan subdomain": "https://garyvee.stan.store/",
  "Lnk.Bio": "https://lnk.bio/x", Later: "https://linkin.bio/x", "Later site": "https://later.com/link-in-bio/x",
  Carrd: "https://x.carrd.co", "Campsite.bio": "https://campsite.bio/x", "Bio.link": "https://bio.link/x",
  "Bio.link subdomain": "https://komaki.bio.link/", "Taplink at": "https://taplink.at/x",
  "Taplink cc": "https://taplink.cc/x", Milkshake: "https://msha.ke/x", "Milkshake app": "https://milkshake.app/x",
  "Hopp co": "https://hopp.co/x", "Hopp bio": "https://hopp.bio/x", "solo.to": "https://solo.to/x",
  Komi: "https://komi.io/x", Shorby: "https://shor.by/x", "Shorby site": "https://shorby.com/x",
  "Bitly Pages": "https://bit.ly/m/x", AllMyLinks: "https://allmylinks.com/x", Linkpop: "https://linkpop.com/x",
  "Tap.bio": "https://tap.bio/x", "Hoo.be": "https://hoo.be/x", Flowpage: "https://flow.page/x",
  Snipfeed: "https://snipfeed.co/x", Linkfly: "https://linkfly.to/x", "Direct.me": "https://direct.me/x",
};

describe("every service on the canonical list is detected", () => {
  it.each(Object.entries(CANONICAL_PROFILES))("%s", (_name, url) => {
    expect(linkInBioService(url)).not.toBeNull();
    expect(isLinkInBioUrl(url)).toBe(true);
  });

  it("the registry and the canonical list are the same services", () => {
    const listed = new Set(Object.values(CANONICAL_PROFILES).map((u) => linkInBioService(u)!.key));
    expect([...listed].sort()).toEqual(LINK_IN_BIO_SERVICES.map((s) => s.key).sort());
  });

  it("ordinary addresses are not link pages", () => {
    for (const url of ["https://bit.ly/3abcDEF", "https://carrd.co/", "https://later.com/", "https://fullspecstaff.com/", "https://www.instagram.com/fullspecstaff"]) {
      expect(isLinkInBioUrl(url)).toBe(false);
    }
  });
});
