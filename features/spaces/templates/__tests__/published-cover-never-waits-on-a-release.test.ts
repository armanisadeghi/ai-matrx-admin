// A published template's cover never depends on an app release (ADVERSARIAL-7 F3). `gallery:<key>` is resolved from
// the cover library bundled in the app, so a pack published before the release that ships its photo drew flat gray.
// Publish now writes the resolved durable src/thumb beside the key; readers use the key when the bundled library
// knows it, else the published address; and publish refuses a key it cannot resolve.

import { COVER_LIBRARY, withDurableCover } from "@/lib/spaces-blocks/cover-library";
import { packDeclaration, withDurableCovers, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

import { galleryImage } from "../../page/gallery";

const photo = COVER_LIBRARY[0];
const pack = (cover: unknown) =>
  ({ catalogueId: "SP9999", version: 1, title: "T", description: "d", forWho: "w", icon: { emoji: "x" }, cover, category: "business", tags: ["a"], pages: [{ key: "home", title: "T", parent: null, cover, blocks: [] }], spec: { id: "t", name: "T" } }) as unknown as SpaceTemplatePack;

describe("a published cover carries its own address", () => {
  it("a key missing from the bundled library still draws the published image (red before: null, flat gray)", () => {
    const published = { url: "gallery:brand-new-photo-not-in-this-app", src: "https://cdn.example/new-2000.webp", thumb: "https://cdn.example/new-480.webp" };
    expect(galleryImage(published.url, false, published)).toBe(published.src);
    expect(galleryImage(published.url, true, published)).toBe(published.thumb);
    expect(galleryImage(published.url)).toBeNull(); // no published address and no key: honest gray, as before
  });

  it("the bundled library wins when it knows the key", () => {
    expect(galleryImage(`gallery:${photo.key}`, false, { src: "https://stale.example/x.webp" })).toBe(photo.src);
  });

  it("publish writes src/thumb for the template cover, the card face and every page cover", () => {
    const decl = packDeclaration(pack({ url: `gallery:${photo.key}`, offsetY: 40 }), { card: {} });
    const want = { url: `gallery:${photo.key}`, offsetY: 40, src: photo.src, thumb: photo.thumb };
    expect(decl.spacePack.cover).toEqual(want);
    expect(decl.spacePack.pages[0].cover).toEqual(want);
    expect((decl.card as { space: { cover: unknown } }).space.cover).toEqual(want);
  });

  it("bundled gradients are left alone; a key it cannot resolve is refused", () => {
    expect(withDurableCover({ url: "gallery:gradient-sky" })).toEqual({ url: "gallery:gradient-sky" });
    expect(() => withDurableCovers(pack({ url: "gallery:no-such-photo-anywhere" }))).toThrow(/not a cover we can resolve/);
    expect(() => packDeclaration(pack({ url: "gallery:no-such-photo-anywhere" }), { card: {} })).toThrow(/no-such-photo-anywhere/);
  });
});
