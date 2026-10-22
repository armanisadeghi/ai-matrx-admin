// features/spaces/page/gallery.ts — the pictures Spaces ships with (Notion's cover gallery and picture
// icons), bundled as static assets inside the feature: no external fetch, no Notion assets.
//
// Stored as `{ url: "gallery:<key>" }` like the CSS gradients, so a page keeps its choice by name and a
// build can re-encode the files without touching a saved page.

import desertDunes from "../assets/covers/desert-dunes.webp";
import goldenPalms from "../assets/covers/golden-palms.webp";
import lavenderDusk from "../assets/covers/lavender-dusk.webp";
import mistyMountains from "../assets/covers/misty-mountains.webp";
import oceanHorizon from "../assets/covers/ocean-horizon.webp";
import pineForest from "../assets/covers/pine-forest.webp";
import { COVER_LIBRARY, libraryCover } from "@/lib/spaces-blocks/cover-library";
import portraitFounder from "../assets/icons/portrait-founder.webp";

export const GALLERY_PREFIX = "gallery:";

/** The "Color & gradient" covers, drawn with CSS. */
export const COVER_GALLERY: Record<string, string> = {
  "gradient-sunset": "linear-gradient(135deg, #f6d365 0%, #fda085 45%, #2f7d6d 100%)",
  "gradient-ocean": "linear-gradient(135deg, #2e3192 0%, #1bffff 100%)",
  "gradient-dusk": "linear-gradient(135deg, #42275a 0%, #734b6d 100%)",
  "gradient-meadow": "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  "gradient-peach": "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "gradient-sky": "linear-gradient(180deg, #a1c4fd 0%, #c2e9fb 100%)",
  "solid-red": "#e16259",
  "solid-yellow": "#dfab01",
  "solid-blue": "#0b6e99",
  "solid-beige": "#e8dfd0",
  "solid-green": "#4d6461",
  "solid-gray": "#9b9a97",
};

/** Cover pictures, in the order the picker shows them. */
export const COVER_PHOTOS: Array<{ key: string; label: string; src: string }> = [
  { key: "photo-golden-palms", label: "Golden palms", src: goldenPalms.src },
  { key: "photo-desert-dunes", label: "Desert dunes", src: desertDunes.src },
  { key: "photo-ocean-horizon", label: "Ocean horizon", src: oceanHorizon.src },
  { key: "photo-misty-mountains", label: "Misty mountains", src: mistyMountains.src },
  { key: "photo-lavender-dusk", label: "Lavender dusk", src: lavenderDusk.src },
  { key: "photo-pine-forest", label: "Pine forest", src: pineForest.src },
];

/** Picture icons (Notion's portrait-style page icon) — illustrated, drawn procedurally; never a photo of a person. */
export const ICON_PICTURES: Array<{ key: string; label: string; src: string }> = [{ key: "portrait-founder", label: "Illustrated portrait", src: portraitFounder.src }];

const BY_KEY = new Map([...COVER_PHOTOS, ...ICON_PICTURES].map((p) => [p.key, p.src]));

/** The picture a `gallery:<key>` value names — a bundled photo, a cover-library photo (our CDN), or the published src/thumb of a newer one — or null
 *  (a gradient key, or not a gallery value). `small` asks for the library's 480px copy (pickers, cards). */
export function galleryImage(url: string, small = false, published?: { src?: string; thumb?: string } | null): string | null {
  if (!url.startsWith(GALLERY_PREFIX)) return null;
  const bundled = BY_KEY.get(url.slice(GALLERY_PREFIX.length));
  if (bundled) return bundled;
  const lib = libraryCover(url);
  if (lib) return small ? lib.thumb : lib.src;
  // The key is newer than this app's bundled library: the address published beside it (template-pack withDurableCovers).
  return (small ? (published?.thumb ?? published?.src) : published?.src) ?? null;
}

/** The cover library grouped by category, in the order the categories first appear in the manifest. */
export function libraryCoverGroups(): Array<{ category: string; covers: typeof COVER_LIBRARY }> {
  const groups = new Map<string, Array<(typeof COVER_LIBRARY)[number]>>();
  for (const c of COVER_LIBRARY) groups.set(c.category, [...(groups.get(c.category) ?? []), c]);
  return [...groups].map(([category, covers]) => ({ category, covers }));
}
