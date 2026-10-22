"use client";

/**
 * The picture a Smart Add candidate shows, as one URL for the shared CandidateCard (`imageUrl`).
 *
 * Order of truth is SocialImage's: the stored copy behind the signed-in door (a blob URL, cached per
 * session) -> the provider's own URL when it is a format a browser can draw -> null (the card then shows
 * its `mark` or the initial). Reuses SocialImage's door cache (`storedImageUrl`), so a stored avatar is
 * fetched once however many cards show it.
 */

import { useEffect, useState } from "react";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { browserImageUrl } from "@/lib/media/external-image";
import { isDrawableUrl, storedImageUrl, youtubeThumbSafe } from "@/features/marketing/social/components/SocialImage";

export function useCandidateImage(door: string | null, url: string | null | undefined): string | null {
  const organizationId = useAppSelector(selectOrganizationId) ?? "";
  const direct = isDrawableUrl(url) ? browserImageUrl(youtubeThumbSafe(url) ?? url) : null;
  const [stored, setStored] = useState<{ door: string; src: string | null } | null>(null);

  useEffect(() => {
    if (!door || !organizationId) return;
    let alive = true;
    void storedImageUrl(door, organizationId).then((src) => {
      if (alive) setStored({ door, src });
    });
    return () => {
      alive = false;
    };
  }, [door, organizationId]);

  if (!door) return direct;
  const mine = stored?.door === door ? stored : null;
  // The door answered: its copy, else the provider's own URL. Not answered yet: nothing (the mark shows).
  return mine ? (mine.src ?? direct) : null;
}
