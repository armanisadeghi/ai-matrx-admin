"use client";

/**
 * Smart Add — the logo slot's near-identical images, grouped (aidream `POST /brand-intake/images/groups`,
 * services/brand_intake/image_groups.py; design: common-docs smart-add-brand IMAGES.md).
 *
 * The same mark arrives from the website and from every profile photo. The server fingerprints each image once and
 * groups the near-identical ones; the screen shows ONE tile per group (the best source) with a "3 sources" badge whose
 * hover lists every source and its size. Keeping or starring a group answers every source in it: nothing is dropped,
 * so if one host goes away later the others remain. Until the groups arrive (or if they cannot be read) every image
 * is its own tile, exactly as before.
 */

import { useEffect, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { postJson } from "@/lib/python-client";
import type { EvidenceItem } from "./evidence";

export interface ImageFingerprint {
  key: string;
  format: string | null;
  width: number | null;
  height: number | null;
  has_alpha: boolean;
  error: string | null;
}

interface ImageGroupWire {
  group_id: string;
  representative: string;
  keys: string[];
}

interface ImageGroupsWire {
  groups: ImageGroupWire[];
  fingerprints: Record<string, ImageFingerprint>;
}

/** One tile: the best source first, then every other source of the same picture. */
export interface LogoGroup {
  id: string;
  lead: EvidenceItem;
  members: EvidenceItem[];
  sizes: Record<string, ImageFingerprint | undefined>;
}

/** Groups the logo items. Every item lands in exactly one group, in the order the items arrived. */
export function useLogoGroups(logos: EvidenceItem[]): LogoGroup[] {
  // The request as a string: the effect re-asks only when the set of images changes (findings stream in).
  const request = JSON.stringify(
    [...logos]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((l) => ({ key: l.key, url: l.image_url ?? l.value, profile_id: l.profile_id, platform: l.platform, where: l.source.where })),
  );
  const [wire, setWire] = useState<{ request: string; data: ImageGroupsWire } | null>(null);

  useEffect(() => {
    const images = JSON.parse(request) as unknown[];
    if (images.length < 2) return;
    let live = true;
    // Wait until the set has been still for a moment, then ask once for that set.
    const timer = setTimeout(() => {
      postJson<ImageGroupsWire>("/brand-intake/images/groups", { images })
        .then(({ data }) => {
          if (live) setWire({ request, data });
        })
        .catch((err: unknown) => {
          // Grouping only merges tiles: without it every image still shows as its own tile.
          console.warn("[smart-add] image groups unavailable; showing every image", err);
        });
    }, 700);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [request]);

  const byKey = new Map(logos.map((l) => [l.key, l]));
  const data = wire?.data;
  const groupOf = new Map<string, ImageGroupWire>();
  for (const g of data?.groups ?? []) for (const k of g.keys) groupOf.set(k, g);
  const out: LogoGroup[] = [];
  const placed = new Set<string>();
  for (const item of logos) {
    if (placed.has(item.key)) continue;
    const g = groupOf.get(item.key);
    const keys = g ? g.keys.filter((k) => byKey.has(k) && !placed.has(k)) : [item.key];
    const members = keys.flatMap((k) => byKey.get(k) ?? []);
    for (const k of keys) placed.add(k);
    const lead = (g && keys.includes(g.representative) && byKey.get(g.representative)) || members[0] || item;
    out.push({
      id: g?.group_id ?? item.key,
      lead,
      members: [lead, ...members.filter((m) => m.key !== lead.key)],
      sizes: Object.fromEntries(keys.map((k) => [k, data?.fingerprints[k]])),
    });
  }
  return out;
}

const sizeText = (fp: ImageFingerprint | undefined): string =>
  fp?.width && fp?.height ? `${fp.width}×${fp.height}${fp.format ? ` ${fp.format.toLowerCase()}` : ""}` : "";

/** "3 sources" on a grouped tile; the hover lists each source and its size. Absolutely placed: no layout shift. */
export function SourcesBadge({ group, labelOf }: { group: LogoGroup; labelOf: (item: EvidenceItem) => string }) {
  if (group.members.length < 2) return null;
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <span
          className="absolute -left-1.5 -top-1.5 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground shadow-sm"
          data-testid="smart-add-logo-sources"
        >
          {group.members.length} sources
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="flex w-64 flex-col gap-1 text-xs" data-testid="smart-add-logo-sources-list">
        {group.members.map((m) => (
          <span key={m.key} className="flex items-center justify-between gap-3">
            <span className="truncate">{labelOf(m) || "image"}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{sizeText(group.sizes[m.key])}</span>
          </span>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}
