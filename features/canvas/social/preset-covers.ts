/**
 * Preset cover image catalog for canvas sharing.
 *
 * These are curated public images used as the Open Graph / social-share
 * preview for shared canvases. Users can pick one of these or upload their
 * own via the ShareCoverImagePicker.
 *
 * Images are hosted by Unsplash (stable CDN) with fixed photo IDs. Each
 * entry provides:
 *   - `ogUrl`:    1200×630 image used as the actual OG image meta tag
 *   - `thumbUrl`: smaller 320×168 preview used inside the picker grid
 *
 * Unsplash license: free for commercial & personal use (no attribution
 * required), see https://unsplash.com/license.
 */
export interface PresetCover {
  id: string;
  label: string;
  /** Theme tag — used to group or filter covers in the picker */
  theme: "abstract" | "study" | "nature" | "minimal" | "creative";
  /** 1200×630 image URL — embedded as the OG image */
  ogUrl: string;
  /** Smaller preview used in the picker grid (320×168) */
  thumbUrl: string;
}

const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=entropy&auto=format&q=80`;

const cover = (
  id: string,
  label: string,
  theme: PresetCover["theme"],
  photoId: string,
): PresetCover => ({
  id,
  label,
  theme,
  ogUrl: unsplash(photoId, 1200, 630),
  thumbUrl: unsplash(photoId, 320, 168),
});

export const PRESET_COVERS: PresetCover[] = [
  cover("books-open", "Open Book", "study", "photo-1481627834876-b7833e8f5570"),
  cover(
    "study-notes",
    "Study Notes",
    "study",
    "photo-1434030216411-0b793f4b4173",
  ),
  cover(
    "journal-coffee",
    "Focused",
    "study",
    "photo-1508780709619-79562169bc64",
  ),
  cover(
    "books-shelf",
    "Knowledge",
    "study",
    "photo-1516321318423-f06f85e504b3",
  ),

  cover("gradient-blue", "Ocean", "abstract", "photo-1557672172-298e090bd0f1"),
  cover(
    "gradient-purple",
    "Aurora",
    "abstract",
    "photo-1557683316-973673baf926",
  ),
  cover(
    "gradient-orange",
    "Sunset",
    "abstract",
    "photo-1557683311-eac922347aa1",
  ),
  cover(
    "abstract-colorful",
    "Prism",
    "abstract",
    "photo-1579546929518-9e396f3cc809",
  ),

  cover(
    "starry-mountains",
    "Wonder",
    "nature",
    "photo-1519681393784-d120267933ba",
  ),
  cover("misty-forest", "Calm", "nature", "photo-1441974231531-c6227db76b6e"),
  cover("pastel-sky", "Horizon", "nature", "photo-1506905925346-21bda4d32df4"),

  cover(
    "minimal-paper",
    "Minimal",
    "minimal",
    "photo-1455390582262-044cdead277a",
  ),
];

export function getPresetCoverByUrl(url: string | null): PresetCover | null {
  if (!url) return null;
  return PRESET_COVERS.find((c) => c.ogUrl === url) ?? null;
}
