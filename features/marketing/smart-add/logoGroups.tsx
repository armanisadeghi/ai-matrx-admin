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

import { useEffect, useRef, useState } from "react";
import { Chip, Button, PropertyRow } from "@ai-matrx/design-system/controls";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { postJson } from "@/lib/python-client";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
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
  /** Sources the person separated out of this picture's automatic group (they are tiles of their own now). */
  apart: EvidenceItem[];
}

/**
 * Groups the logo items. Every item lands in exactly one group, in the order the items arrived.
 * `separated`: the keys the person split out of their automatic group; each is its own tile.
 */
export function useLogoGroups(logos: EvidenceItem[], separated: ReadonlySet<string>): LogoGroup[] {
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
    for (const k of keys) placed.add(k);
    const sizesOf = (ks: string[]) => Object.fromEntries(ks.map((k) => [k, data?.fingerprints[k]]));
    const apartKeys = keys.filter((k) => separated.has(k));
    const apart = apartKeys.flatMap((k) => byKey.get(k) ?? []);
    const stay = keys.filter((k) => !separated.has(k));
    if (stay.length) {
      const members = stay.flatMap((k) => byKey.get(k) ?? []);
      const lead = (g && stay.includes(g.representative) && byKey.get(g.representative)) || members[0] || item;
      out.push({
        id: g?.group_id ?? item.key,
        lead,
        members: [lead, ...members.filter((m) => m.key !== lead.key)],
        sizes: sizesOf(keys),
        apart,
      });
    }
    // A separated source is a tile of its own; its id is its key so the tile survives regrouping.
    for (const m of apart) out.push({ id: m.key, lead: m, members: [m], sizes: sizesOf([m.key]), apart: apart.filter((a) => a.key !== m.key) });
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

/** What the person can do to a tile's sources (state lives with the session's answers: runMemory `separated`). */
export interface SourceControls {
  separated: ReadonlySet<string>;
  /** Split these keys out into their own tiles (`true`), or put them back with their group (`false`). */
  onSeparate: (keys: string[], on: boolean) => void;
}

/** One image of a source: the profile's own photo through its door, else the address through our image proxy. */
function SourcePicture({ item, className, size = 16 }: { item: EvidenceItem; className: string; size?: number }) {
  if (item.profile_id) {
    return (
      <SocialImage
        door={profileAvatarDoor(item.profile_id)}
        url={item.image_url}
        fallback={<PlatformMark platform={item.platform ?? ""} size={size} />}
        className={className}
      />
    );
  }
  const raw = item.image_url ?? item.value;
  return <img src={/^https?:\/\//i.test(raw) ? proxiedExternalImageUrl(raw) : raw} alt="" className={className} />;
}

/**
 * The enlarged image of a tile. A grouped tile (or one with sources set apart) gets a slim sidebar on the right:
 * every source with its picture, name, size and format, the one shown on the tile marked, "Separate" per source and
 * "Separate all". Clicking a source shows it in the preview. Separated sources can always be put back.
 */
export function LogoEnlarge({
  open,
  onOpenChange,
  group,
  controls,
  labelOf,
  previewClass,
  onBackdrop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: LogoGroup;
  controls: SourceControls;
  labelOf: (item: EvidenceItem) => string;
  /** The backdrop the preview sits on (the tile's own light / dark / checker). */
  previewClass: string;
  onBackdrop: (shade: "light" | "dark") => void;
}) {
  const [viewKey, setViewKey] = useState<string | null>(null);
  const everything = [...group.members, ...group.apart];
  // The server could not read some images: the size the browser sees in each thumbnail stands in for it.
  const listRef = useRef<HTMLUListElement>(null);
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});
  useEffect(() => {
    if (!open) return;
    let tries = 0;
    const read = () => {
      const found: Record<string, { width: number; height: number }> = {};
      let missing = 0;
      listRef.current?.querySelectorAll<HTMLElement>("[data-source-key]").forEach((el) => {
        const img = el.querySelector("img");
        if (img?.naturalWidth) found[el.dataset.sourceKey as string] = { width: img.naturalWidth, height: img.naturalHeight };
        else missing++;
      });
      setMeasured((cur) => ({ ...cur, ...found }));
      if (missing && ++tries < 12) timer = setTimeout(read, 500);
    };
    let timer = setTimeout(read, 300);
    return () => clearTimeout(timer);
  }, [open, everything.length]);
  const shown = everything.find((m) => m.key === viewKey) ?? group.lead;
  const nameOf = (m: EvidenceItem) => {
    const label = labelOf(m) || "image";
    return m.profile_id ? `${label} photo` : label;
  };
  const hasSidebar = everything.length > 1;
  const fingerprint = (m: EvidenceItem) => group.sizes[m.key];
  const sourceRow = (m: EvidenceItem) => {
    const fp = fingerprint(m);
    const apart = controls.separated.has(m.key);
    const px = fp?.width && fp?.height ? fp : measured[m.key];
    const dims = px?.width && px?.height ? `${px.width} × ${px.height} px` : null;
    return (
      <li key={m.key} className="flex flex-col gap-1.5 border-b border-border pb-2 last:border-b-0" data-testid="smart-add-logo-source">
        <div className="flex items-center gap-2">
          {/* ui-exception: a source you select to preview; the 28px Button cannot hold a thumbnail */}
          <button
            type="button"
            onClick={() => setViewKey(m.key)}
            aria-pressed={shown.key === m.key}
            aria-label={`Show the ${nameOf(m)}`}
            data-source-key={m.key}
            className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted p-1 ${shown.key === m.key ? "border-primary ring-2 ring-primary" : "border-border"}`}
          >
            <SourcePicture item={m} className="size-full object-contain" />
          </button>
          <div className="min-w-0 flex-1">
            <PropertyRow
              label={nameOf(m)}
              value={[dims, fp?.format ? fp.format.toUpperCase() : null].filter(Boolean).join(" · ") || null}
              missing={dims ? undefined : "Size unknown"}
              meta={m.key === group.lead.key && group.members.length > 1 ? <Chip label="Shown on the tile" tone="primary" /> : null}
            />
          </div>
        </div>
        {apart ? (
          <Button variant="outline" onClick={() => controls.onSeparate([m.key], false)}>Put back</Button>
        ) : group.members.length > 1 ? (
          <Button variant="outline" onClick={() => controls.onSeparate([m.key], true)}>Separate</Button>
        ) : null}
      </li>
    );
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={hasSidebar ? "max-w-4xl" : "max-w-2xl"} data-testid="smart-add-logo-enlarged">
        <DialogTitle>{nameOf(shown)}</DialogTitle>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className={`flex min-h-64 items-center justify-center overflow-hidden rounded-lg border p-4 ${previewClass}`}>
              {/* relative: a profile photo fills its nearest positioned box */}
              <span className="relative block h-[50dvh] w-full">
                <SourcePicture item={shown} size={48} className="size-full object-contain" />
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onBackdrop("light")}>Light background</Button>
              <Button variant="outline" onClick={() => onBackdrop("dark")}>Dark background</Button>
            </div>
          </div>
          {hasSidebar ? (
            <aside className="flex w-full shrink-0 flex-col gap-2 md:w-72" data-testid="smart-add-logo-sources-sidebar">
              <div className="type-label">Sources</div>
              <ul ref={listRef} className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto">{everything.map(sourceRow)}</ul>
              {group.members.length > 1 ? (
                <Button variant="outline" onClick={() => controls.onSeparate(group.members.map((m) => m.key), true)}>
                  Separate all
                </Button>
              ) : null}
              {everything.filter((m) => controls.separated.has(m.key)).length > 1 ? (
                <Button variant="outline" onClick={() => controls.onSeparate(everything.filter((m) => controls.separated.has(m.key)).map((m) => m.key), false)}>
                  Put all back
                </Button>
              ) : null}
            </aside>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
