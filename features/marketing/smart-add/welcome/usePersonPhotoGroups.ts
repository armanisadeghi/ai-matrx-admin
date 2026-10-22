"use client";

/**
 * Sign-up welcome — "Which one is you?" needs to know which candidates show the SAME profile photo (live 2026-10-21:
 * one Thomas Frank on LinkedIn, Instagram and YouTube was two cards). Each platform serves its own copy of the photo,
 * so the addresses differ; the server's perceptual fingerprints (the logo slot's image groups, logoGroups.tsx
 * `postImageGroups`) say which are one picture. The cards wait for the answer (`settled`) so they never re-merge on
 * screen; a failed or slow read settles without it (the cards then group by the other rules only).
 */

import { useEffect, useState } from "react";
import { postImageGroups } from "../logoGroups";
import type { EvidenceItem } from "../evidence";
import { candidatePhotos } from "./peopleGroups";

/** The longest the cards wait for the photo groups. */
export const PHOTO_GROUPS_WAIT_MS = 6000;

export interface PersonPhotoGroups {
  /** Evidence key → photo group id, for the photos read. */
  groups: ReadonlyMap<string, string>;
  /** The groups for the current candidates are in (or will not come). */
  settled: boolean;
}

const NONE: ReadonlyMap<string, string> = new Map();

/** `ready`: the candidates are final (the anchor round settled); nothing is asked before. */
export function usePersonPhotoGroups(items: readonly EvidenceItem[], name: string, ready: boolean): PersonPhotoGroups {
  const photos = name && ready ? candidatePhotos(items, name) : [];
  const request = JSON.stringify([...photos].sort((a, b) => a.key.localeCompare(b.key)));
  const needed = photos.length >= 2;
  const [answer, setAnswer] = useState<{ request: string; groups: ReadonlyMap<string, string> } | null>(null);

  useEffect(() => {
    if (!needed) return;
    let live = true;
    let answered = false;
    // The first answer stands (a late one after the wait would re-merge cards already on screen).
    const done = (groups: ReadonlyMap<string, string>) => {
      if (!live || answered) return;
      answered = true;
      setAnswer({ request, groups });
    };
    const timer = window.setTimeout(() => done(NONE), PHOTO_GROUPS_WAIT_MS);
    postImageGroups(JSON.parse(request))
      .then((data) => {
        const map = new Map<string, string>();
        for (const g of data.groups) for (const k of g.keys) map.set(k, g.group_id);
        done(map);
      })
      .catch((err: unknown) => {
        console.warn("[welcome] photo groups unavailable; people grouped without them", err);
        done(NONE);
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [request, needed]);

  if (!ready) return { groups: NONE, settled: false };
  if (!needed) return { groups: NONE, settled: true };
  return answer?.request === request ? { groups: answer.groups, settled: true } : { groups: NONE, settled: false };
}
