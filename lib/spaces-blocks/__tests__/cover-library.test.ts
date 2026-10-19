// The platform cover library (lib/spaces-blocks/cover-library): the checker accepts a library cover and refuses a
// key that names no cover; the root page carries the template's cover; every photo is our own durable CDN media
// with its credit and licence; and no two template packs (other than the design-system packs) share a cover.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { COVER_LIBRARY, isKnownGalleryCover, libraryCover } from "../cover-library";
import { checkPack } from "../template-pack-check";
import { SPACE_TEMPLATE_CATEGORIES, type SpaceTemplatePack } from "../template-pack";

const PACKS_DIR = join(__dirname, "../../../features/spaces/templates/packs");
const PACK = JSON.parse(readFileSync(join(PACKS_DIR, "projects-and-tasks.pack.json"), "utf8")) as SpaceTemplatePack;
const fresh = () => JSON.parse(JSON.stringify(PACK)) as SpaceTemplatePack;
const withCover = (url: string) => {
  const p = fresh();
  p.cover = { url, offsetY: 50 };
  p.pages[0].cover = { url, offsetY: 50 };
  return p;
};
/** Another session's design-system packs, which keep their own covers. */
const DESIGN_PACK = (id: string) => id === "SP0363" || /^SP049\d$/.test(id);

describe("the cover library", () => {
  it("holds about 200 photos covering every template category", () => {
    expect(COVER_LIBRARY.length).toBeGreaterThanOrEqual(190);
    const cats = new Set(COVER_LIBRARY.map((c) => c.category));
    for (const c of SPACE_TEMPLATE_CATEGORIES) expect(cats.has(c.key) ? c.key : `missing ${c.key}`).toBe(c.key);
  });

  it("is our own durable media with credit and licence on every photo", () => {
    const keys = new Set<string>();
    const ids = new Set<string>();
    for (const c of COVER_LIBRARY) {
      expect(keys.has(c.key)).toBe(false);
      expect(ids.has(c.fileId)).toBe(false);
      keys.add(c.key);
      ids.add(c.fileId);
      expect(c.fileId).toMatch(/^[0-9a-f-]{36}$/);
      expect(c.src).toMatch(/^https:\/\/cdn\.matrxserver\.com\//);
      expect(c.thumb).toMatch(/^https:\/\/cdn\.matrxserver\.com\//);
      expect(c.src).toContain(c.fileId);
      expect(c.credit.length).toBeGreaterThan(0);
      expect(c.license).toBe("Pexels License");
      expect(c.alt.length).toBeGreaterThan(0);
      expect(/^(photo|gradient|solid)-/.test(c.key)).toBe(false);
    }
  });

  it("resolves a key or a gallery value, and nothing else", () => {
    const first = COVER_LIBRARY[0];
    expect(libraryCover(first.key)?.fileId).toBe(first.fileId);
    expect(libraryCover(`gallery:${first.key}`)?.src).toBe(first.src);
    expect(libraryCover("gallery:nowhere-at-all")).toBeNull();
    expect(isKnownGalleryCover(`gallery:${first.key}`)).toBe(true);
    expect(isKnownGalleryCover("gallery:photo-pine-forest")).toBe(true);
    expect(isKnownGalleryCover("gallery:nowhere-at-all")).toBe(false);
  });
});

describe("checkPack and covers", () => {
  it("accepts a library cover", () => {
    expect(checkPack(withCover(`gallery:${COVER_LIBRARY[5].key}`))).toEqual([]);
  });

  it("refuses a gallery key that names no cover, on the pack and on a page", () => {
    const findings = checkPack(withCover("gallery:healthcare-made-up-photo"));
    expect(findings.map((f) => f.at)).toEqual(expect.arrayContaining(["cover", "pages[0] (projects-and-tasks).cover"]));
    expect(findings.find((f) => f.at === "cover")?.says).toMatch(/not a gallery cover/);
  });

  it("refuses a root page whose cover is not the template's", () => {
    const p = withCover(`gallery:${COVER_LIBRARY[5].key}`);
    p.pages[0].cover = { url: `gallery:${COVER_LIBRARY[6].key}`, offsetY: 50 };
    expect(checkPack(p).map((f) => f.says)).toContain("The root page's cover is the template's cover: write the same value.");
  });
});

describe("every template pack has its own cover", () => {
  const packs = readdirSync(PACKS_DIR)
    .filter((f) => f.endsWith(".pack.json"))
    .map((f) => JSON.parse(readFileSync(join(PACKS_DIR, f), "utf8")) as SpaceTemplatePack & { catalogueId: string });

  it("no two packs (other than the design-system packs) share a cover", () => {
    const seen = new Map<string, string>();
    const shared: string[] = [];
    for (const p of packs) {
      if (DESIGN_PACK(p.catalogueId) || !p.cover) continue;
      const k = JSON.stringify("url" in p.cover ? p.cover.url : p.cover);
      if (seen.has(k)) shared.push(`${p.catalogueId} shares ${k} with ${seen.get(k)}`);
      else seen.set(k, p.catalogueId);
    }
    expect(shared).toEqual([]);
  });
});
