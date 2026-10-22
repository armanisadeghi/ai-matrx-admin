"use client";

// features/spaces/public/SpaceTemplateIcon.tsx — a Space template's icon (its own emoji, Lucide icon or picture)
// and its cover strip on the public gallery's cards (/templates, features/make/gallery/TemplateCards.tsx). A FENCE
// ENTRY POINT, kept apart from TemplatePackPreview so a card grid never pulls in the editor.

import type { SpaceMedia } from "@/lib/spaces-blocks/types";

import { COVER_GALLERY, GALLERY_PREFIX, galleryImage } from "../page/gallery";
import { SpaceIcon } from "../page/SpaceIcon";

export function SpaceTemplateIcon({ media, size = 28 }: { media: SpaceMedia | null | undefined; size?: number }) {
  return <SpaceIcon media={media} size={size} />;
}

/** A template's cover as a card strip: a gallery photo (the library's small copy), a gradient, or nothing. */
export function SpaceTemplateCover({ cover, className }: { cover: (SpaceMedia & { offsetY?: number }) | null | undefined; className?: string }) {
  if (!cover || !("url" in cover) || !cover.url.startsWith(GALLERY_PREFIX)) return null;
  const src = galleryImage(cover.url, true, cover);
  if (src) {
    return <img src={src} alt="" loading="lazy" decoding="async" className={className} style={{ objectFit: "cover", objectPosition: `center ${cover.offsetY ?? 50}%` }} data-space-card-cover="" />;
  }
  const background = COVER_GALLERY[cover.url.slice(GALLERY_PREFIX.length)];
  return background ? <span className={className} style={{ background }} data-space-card-cover="" aria-hidden="true" /> : null;
}
