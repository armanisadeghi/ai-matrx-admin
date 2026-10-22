// lib/spaces-blocks/cover-library.ts — the platform cover library: real photos for page and template covers.
//
// Each photo is platform media in our own file service (Matrx System organization, `system-files/spaces-covers/`,
// owned by the template owner, published to the web): `fileId` is its identity, `src` / `thumb` are the durable
// CDN addresses an anonymous reader draws (never a third-party link). Credit and licence travel with every photo.
// The manifest (cover-library.json) is written by scripts/spaces-cover-library/ (source.py → upload.py).
//
// A page or pack names a library photo the way it names any gallery cover: `{ "url": "gallery:<key>" }`, so a
// saved page keeps its choice by name. Pure: no React, no feature import (the pack checker and the public gallery
// read it from outside the Spaces fence).

import manifest from "./cover-library.json";

export interface LibraryCover {
  key: string;
  /** The file service id (identity). */
  fileId: string;
  /** Durable CDN address of the 2000px photo. */
  src: string;
  /** Durable CDN address of a 480px copy for pickers and cards. */
  thumb: string;
  alt: string;
  /** A Space template category key (SPACE_TEMPLATE_CATEGORIES). */
  category: string;
  tags: string[];
  credit: string;
  creditUrl: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  /** The photo's average color, drawn while it loads. */
  color: string | null;
  width: number;
  height: number;
}

export const COVER_LIBRARY: readonly LibraryCover[] = manifest as LibraryCover[];

const BY_KEY = new Map(COVER_LIBRARY.map((c) => [c.key, c]));

export const GALLERY_COVER_PREFIX = "gallery:";

/** The library photo a key (or a `gallery:<key>` value) names, or null. */
export function libraryCover(keyOrUrl: string): LibraryCover | null {
  const key = keyOrUrl.startsWith(GALLERY_COVER_PREFIX) ? keyOrUrl.slice(GALLERY_COVER_PREFIX.length) : keyOrUrl;
  return BY_KEY.get(key) ?? null;
}

/**
 * The gallery covers Spaces bundles (features/spaces/page/Cover.tsx COVER_GALLERY and page/gallery.ts COVER_PHOTOS),
 * named here so the pack checker can refuse an unknown key without importing the feature. A test keeps the two equal.
 */
export const BUNDLED_COVER_KEYS = [
  "gradient-sunset",
  "gradient-ocean",
  "gradient-dusk",
  "gradient-meadow",
  "gradient-peach",
  "gradient-sky",
  "solid-red",
  "solid-yellow",
  "solid-blue",
  "solid-beige",
  "solid-green",
  "solid-gray",
  "photo-golden-palms",
  "photo-desert-dunes",
  "photo-ocean-horizon",
  "photo-misty-mountains",
  "photo-lavender-dusk",
  "photo-pine-forest",
] as const;

const BUNDLED = new Set<string>(BUNDLED_COVER_KEYS);

/**
 * A cover value with the library photo's durable addresses written beside its key. A published template's cover must
 * never depend on an app release: the key is used when the app's bundled library knows it, else `src` / `thumb`.
 * Bundled keys (gradients, solid colors, the six shipped photos) are left alone; a key that names nothing THROWS.
 */
export function withDurableCover<C extends { url: string } | object>(cover: C): C {
  const url = (cover as { url?: unknown }).url;
  if (typeof url !== "string" || !url.startsWith(GALLERY_COVER_PREFIX)) return cover;
  const lib = BY_KEY.get(url.slice(GALLERY_COVER_PREFIX.length));
  if (lib) return { ...cover, src: lib.src, thumb: lib.thumb };
  if (BUNDLED.has(url.slice(GALLERY_COVER_PREFIX.length))) return cover;
  throw new Error(`"${url}" is not a cover we can resolve: use a bundled one or a key from the cover library (lib/spaces-blocks/cover-library.json).`);
}

/** Whether `gallery:<key>` names a cover we have (bundled or library). */
export function isKnownGalleryCover(url: string): boolean {
  if (!url.startsWith(GALLERY_COVER_PREFIX)) return false;
  const key = url.slice(GALLERY_COVER_PREFIX.length);
  return BUNDLED.has(key) || BY_KEY.has(key);
}

/** The library photos of one category, in manifest order. */
export function libraryCoversIn(category: string): LibraryCover[] {
  return COVER_LIBRARY.filter((c) => c.category === category);
}
