"use client";

// features/spaces/public/SpaceTemplateIcon.tsx — a Space template's icon (its own emoji, Lucide icon or picture)
// on the public gallery's cards (/templates, features/make/gallery/TemplateCards.tsx). A FENCE ENTRY POINT, kept
// apart from TemplatePackPreview so a card grid never pulls in the editor.

import type { SpaceMedia } from "@/lib/spaces-blocks/types";

import { SpaceIcon } from "../page/SpaceIcon";

export function SpaceTemplateIcon({ media, size = 28 }: { media: SpaceMedia | null | undefined; size?: number }) {
  return <SpaceIcon media={media} size={size} />;
}
