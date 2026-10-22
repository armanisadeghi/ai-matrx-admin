"use client";

/**
 * Relationships — every confirmed thing around the brand that is not its own site or account:
 * other names, people, related companies, competitors, listings / reviews / mentions, and "Not us".
 * Read + manual add/remove over the canonical homes (features/marketing/data/brand-relations.ts),
 * in the shared vocabulary (web.brand_relation_kind). Grounding (where found, why, certainty) is
 * hover-only, never on the row (Arman, 2026-10-14). Plan: smart-add-brand/BRAND-PAGES-PLAN.md.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plus, X } from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, Input } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Peek, PeekHoverCard } from "@ai-matrx/design-system";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import type { Json } from "@/types/database.types";
import { Favicon } from "@/features/research/components/overview/live-pipeline/ui/Favicon";
import { outboundHref } from "@/features/marketing/smart-add/SmartAddExtras";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import {
  deleteProperty,
  listBrandPropertiesForMatching,
  listBrandRelationKinds,
  mergeBrandProfile,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { isMarketingProperty, isMarketingUsage, propertyMatchOnlyReason } from "@/features/marketing/data/relation-usage";
import {
  addBrandExclusion,
  addBrandRelation,
  competitorFromText,
  listBrandExclusions,
  listBrandRelations,
  profileAliases,
  profileCompetitors,
  removeBrandExclusion,
  removeBrandRelation,
  type BrandRelationRow,
} from "@/features/marketing/data/brand-relations";
import { clearStashedRetraction, restoreRetraction, type RetractionSummary } from "@/features/marketing/data/retraction";
import type { MarketingBrand } from "@/features/marketing/types";
import { linkPersonToBrand } from "@/features/marketing/smart-add/relations";
import { brandPeopleKey } from "@/features/marketing/photos/spokespeople";

type GroupKey =
  | "names"
  | "people"
  | "related"
  | "credentials"
  | "memberships"
  | "awards"
  | "press"
  | "competitors"
  | "about"
  | "kept"
  | "not_us";

const GROUP_TITLES: Record<GroupKey, string> = {
  names: "Other names",
  people: "People",
  related: "Related companies",
  credentials: "Credentials",
  memberships: "Memberships",
  awards: "Awards",
  press: "Press",
  competitors: "Competitors",
  about: "Listings, reviews, mentions",
  kept: "Kept for matching",
  not_us: "Not us",
};

const ALIAS = "__alias";

/** Each group's fixed column: names / people / related, then competitors / listings, then not-us. */
const COLUMNS: GroupKey[][] = [
  ["names", "people", "related", "credentials", "memberships"],
  ["awards", "press", "competitors", "about"],
  ["kept", "not_us"],
];

/** A recognized page's typed fact (web.brand_relation_kind metadata.fact) → its own section (VISION Part 22). */
const FACT_GROUP: Partial<Record<string, GroupKey>> = {
  credential: "credentials",
  membership: "memberships",
  award: "awards",
  press_mention: "press",
};

/** The fact's own fields, compact: "AAA-12345 · to Jan 5, 2026", "since 2011", "OC Register · Mar 3, 2025", "2024". */
function factDetail(fact: string | null | undefined, fields: Record<string, string>): string | null {
  const parts =
    fact === "credential"
      ? [fields.number, fields.valid_until ? `to ${fields.valid_until}` : undefined]
      : fact === "membership"
        ? [fields.member_since ? `since ${fields.member_since}` : undefined]
        : fact === "press_mention"
          ? [fields.outlet, fields.date]
          : fact === "award"
            ? [fields.year]
            : [];
  const text = parts.filter(Boolean).join(" · ");
  return text || null;
}
const COLUMN_PLACE = ["", "", "md:col-start-2 xl:col-start-3 xl:row-start-1"];

interface Row {
  id: string;
  label: string;
  url: string | null;
  kindLabel: string | null;
  /** Kept for matching only (relation-usage.ts): its address is plain text, never an outbound or referral link. */
  matchOnly?: boolean;
  /** A Not us logo: the removed image itself, so the row says which logo it is. */
  thumb?: string;
  sentiment?: BrandRelationRow["sentiment"];
  /** Shown the moment Add is pressed, until the save lands: a dimmed row with a spinner. */
  pending?: boolean;
  grounding?: { where: string | null; reason: string | null; confidence: number | null; by: string | null };
  remove: () => Promise<void>;
  /** A Not us entry made by a removal: bring back what the removal took (web.decision_retraction_restore). */
  undo?: () => Promise<void>;
}

function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const SOCIAL_HOSTS: Record<string, string> = {
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "tiktok.com": "TikTok",
  "x.com": "X",
  "twitter.com": "X",
  "youtube.com": "YouTube",
  "pinterest.com": "Pinterest",
  "linkedin.com": "LinkedIn",
  "threads.net": "Threads",
};

/** A row whose name IS its address reads as a link chip: "@handle" on a social site, else the bare domain + path. */
function chipLabel(label: string, url: string | null): { text: string; platform: string | null } | null {
  const raw = /^https?:\/\//i.test(label) ? label : null;
  if (!raw || (url && url.replace(/\/+$/, "") !== raw.replace(/\/+$/, ""))) return null;
  try {
    const u = new URL(raw);
    const hostName = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    const platform = SOCIAL_HOSTS[hostName] ?? null;
    const first = path.split("/").filter(Boolean)[0];
    if (platform && first) return { text: `@${first.replace(/^@/, "")}`, platform };
    return { text: `${hostName}${path}`, platform: null };
  } catch {
    return null;
  }
}

/** The row's name is its own address written without the scheme ("www.instagram.com/acme" for https://www.instagram.com/acme). */
function labelIsAddress(label: string, url: string | null): boolean {
  if (!url) return false;
  const bare = (s: string) => s.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  return bare(label) === bare(url);
}

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-success",
  neutral: "bg-muted-foreground",
  negative: "bg-destructive",
};

export function RelationRowView({ row, canEdit }: { row: Row; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const h = host(row.url);
  const chip = chipLabel(row.label, row.url);
  // A row whose name IS its address is that address, drawn as THE contact value (never for a match-only row).
  const address = !row.matchOnly ? (chip ? row.label : labelIsAddress(row.label, row.url) ? row.url : null) : null;
  const contact = address
    ? contactFactValue({
        kind: SOCIAL_HOSTS[(host(address) ?? "").replace(/^www\./, "")] ? "social_profile" : "website",
        value: address,
        className: "inline-flex min-w-0 text-sm text-foreground",
      })
    : null;
  const g = row.grounding;
  const hasGrounding = Boolean(g && (g.where || g.reason || g.confidence != null));
  if (row.pending) {
    return (
      <li className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 opacity-70" data-testid="brand-relation-pending">
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Adding" />
        <span className="truncate text-sm text-foreground">{row.label}</span>
        {/* The saved row ends in the Remove button; the same, unseen, keeps this row's height when it is swapped (MKT-144). */}
        {canEdit ? <Button variant="quiet" aria-label="Remove" aria-hidden tabIndex={-1} disabled className="invisible ml-auto" icon={<X />} /> : null}
      </li>
    );
  }
  // Kept-for-matching rows carry an address and a reason: they get their own second line, never squeezed beside the name.
  const detail = row.matchOnly && (row.url || g?.reason) ? (
    <span className="flex min-w-0 flex-col gap-0.5 pl-6 text-xs text-muted-foreground">
      {row.url ? (
        <span className="truncate" title={row.url} data-testid="brand-relation-address">
          {row.url}
        </span>
      ) : null}
      {g?.reason ? (
        <span className="line-clamp-2" data-testid="brand-relation-reason">{g.reason}</span>
      ) : null}
    </span>
  ) : null;
  const body = (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-2">
        {row.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxiedExternalImageUrl(row.thumb)} alt="" className="size-5 shrink-0 rounded object-contain" data-testid="brand-relation-thumb" />
        ) : row.url && !contact ? (
          <Favicon hostname={h} size={16} />
        ) : null}
        {contact ? null : <span className="min-w-0 truncate text-sm text-foreground" title={row.label}>{chip ? chip.text : row.label}</span>}
        {chip?.platform && !contact ? <span className="shrink-0 text-xs text-muted-foreground">{chip.platform}</span> : null}
        {h && !chip && !contact && !row.thumb && !row.matchOnly && h !== row.label ? <span className="min-w-0 shrink truncate text-xs text-muted-foreground">{h}</span> : null}
        {row.sentiment ? (
          <span className={`size-1.5 shrink-0 rounded-full ${SENTIMENT_DOT[row.sentiment] ?? ""}`} aria-label={row.sentiment} />
        ) : null}
        {row.kindLabel ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{row.kindLabel}</span> : null}
      </span>
      {detail}
    </span>
  );
  return (
    <li className="group flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted/50" data-testid="brand-relation-row">
      {/* The address keeps its own peek; the grounding peek stays on the rest of the row, so the two never stack. */}
      {contact}
      {hasGrounding ? (
        // Grounding (hover only): why we think so, where it was found, how sure.
        <PeekHoverCard
          trigger={body}
          label={row.label}
          side="bottom"
          align="start"
        >
          <Peek
            size="sm"
            record={{
              kind: "Relationship",
              id: row.id,
              title: row.label,
              body: [
                ...(g?.reason ? [{ section: "Why", text: g.reason }] : []),
                ...(g?.where ? [{ property: "Found", value: g.where }] : []),
                ...(g?.confidence != null ? [{ property: "Certainty", value: `${Math.round(g.confidence * 100)}% sure` }] : []),
                ...(g?.by === "person" ? [{ fact: "Confirmed by a person", muted: true }] : []),
              ],
            }}
          />
        </PeekHoverCard>
      ) : (
        body
      )}
      {row.url && !row.matchOnly && !contact ? (
        <OutboundLink
          href={outboundHref(row.url)}
          className="matrx-tap-area inline-flex shrink-0 items-center text-muted-foreground hover:text-primary"
          aria-label={`Open ${row.label}`}
          title="Open"
        >
          <ExternalLink className="size-3.5" />
        </OutboundLink>
      ) : null}
      {canEdit && row.undo ? (
        <Button
          variant="quiet"
          aria-label={`Undo removal of ${row.label}`}
          disabled={busy}
          data-testid="brand-relation-undo"
          onClick={async () => {
            setBusy(true);
            try {
              await row.undo?.();
            } catch (error) {
              toast.error(`Could not undo: ${extractErrorMessage(error)}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          Undo
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          variant="quiet"
          aria-label={`Remove ${row.label}`}
          title="Remove"
          disabled={busy}
          icon={busy ? <Loader2 className="animate-spin" /> : <X />}
          onClick={async () => {
            setBusy(true);
            try {
              await row.remove();
            } catch (error) {
              toast.error(`Could not remove: ${extractErrorMessage(error)}`);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </li>
  );
}

function groupOf(kind: BrandRelationKind | undefined, key: string): GroupKey {
  if (!kind) return key === "competitor" ? "competitors" : "related";
  // Never used, never shown as ours (relation-usage.ts): Former, Misspelled, Broken link, Maybe…
  if (!isMarketingUsage(kind.usage)) return "kept";
  if (kind.routesTo === "owns" || kind.routesTo === "key_person") return "people";
  if (kind.stance === "competitor") return "competitors";
  const factGroup = kind.fact ? FACT_GROUP[kind.fact] : undefined;
  if (factGroup) return factGroup;
  if (kind.stance === "about_us" || kind.stance === "ours") return "about";
  return "related";
}

export function BrandRelationsCard({ brand, canEdit }: { brand: MarketingBrand; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const kinds = useQuery({ queryKey: ["marketing", "brand-relation-kinds"], queryFn: listBrandRelationKinds, staleTime: 5 * 60_000 });
  const relations = useQuery({ queryKey: ["marketing", "brand-relations", brand.id], queryFn: () => listBrandRelations(brand.id) });
  const exclusions = useQuery({ queryKey: ["marketing", "brand-exclusions", brand.id], queryFn: () => listBrandExclusions(brand.id) });
  const keptProperties = useQuery({
    queryKey: ["marketing", "brand-kept-properties", brand.id],
    queryFn: async () => (await listBrandPropertiesForMatching(brand.id)).filter((p) => !isMarketingProperty(p)),
  });
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<string>("competitor");
  const [sentiment, setSentiment] = useState<"positive" | "neutral" | "negative">("neutral");
  const [adding, setAdding] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<{ group: GroupKey; label: string } | null>(null);

  const kindByKey = new Map((kinds.data ?? []).map((k) => [k.key, k]));
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand-relations", brand.id] }),
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand-kept-properties", brand.id] }),
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand-exclusions", brand.id] }),
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand", brand.id] }),
      // A person added or removed here shows (or leaves) the Spokespeople card without a reload.
      queryClient.invalidateQueries({ queryKey: brandPeopleKey(brand.id) }),
    ]);
  };

  // Edited against the profile the server holds now, never this card's copy (a background write is not a conflict, MKT-151).
  const patchProfile = async (edit: (profile: Record<string, Json>) => Record<string, Json>) => {
    await mergeBrandProfile(brand.id, edit);
    await refresh();
  };

  const groups: Record<GroupKey, Row[]> = {
    names: [],
    people: [],
    related: [],
    credentials: [],
    memberships: [],
    awards: [],
    press: [],
    competitors: [],
    about: [],
    kept: [],
    not_us: [],
  };
  for (const alias of profileAliases(brand.profile)) {
    groups.names.push({
      id: `alias:${alias}`,
      label: alias,
      url: null,
      kindLabel: null,
      remove: () => patchProfile((p) => ({ ...p, brand_aliases: profileAliases(p).filter((a) => a !== alias) })),
    });
  }
  profileCompetitors(brand.profile).forEach((c, index) => {
    groups.competitors.push({
      id: `competitor:${index}:${c.name}`,
      label: c.name,
      url: c.url ?? (c.domain ? `https://${c.domain}` : null),
      kindLabel: c.handles?.join(" ") ?? null,
      remove: () =>
        patchProfile((p) => ({
          ...p,
          competitors: (Array.isArray(p.competitors) ? p.competitors : []).filter((_, i) => i !== index),
        })),
    });
  });
  for (const r of relations.data ?? []) {
    const kind = kindByKey.get(r.relationKey);
    const group = groupOf(kind, r.relationKey);
    const typed = Boolean(kind?.fact && FACT_GROUP[kind.fact] === group);
    const fields = r.siteKind?.fields ?? {};
    groups[group].push({
      id: r.id,
      // A typed fact reads as itself: the credential's or award's name, the association, the headline.
      label: (typed && (fields.name ?? fields.association ?? fields.headline)) || r.label,
      url: r.url,
      matchOnly: !isMarketingUsage(kind?.usage),
      kindLabel: typed ? factDetail(kind?.fact, fields) : (kind?.label ?? r.relationKey),
      sentiment: kind?.hasSentiment ? r.sentiment : null,
      grounding: { where: r.where, reason: r.reason, confidence: r.confidence, by: r.answeredBy },
      remove: async () => {
        await removeBrandRelation(r.id);
        await refresh();
      },
    });
  }
  // The brand's accounts kept for matching only (a dead link): shown here with why, never as a working account.
  for (const p of keptProperties.data ?? []) {
    const why = propertyMatchOnlyReason(p);
    groups.kept.push({
      id: `property:${p.id}`,
      label: p.handle ? `${p.kind} · ${p.handle}` : (p.url ?? p.kind),
      url: p.url,
      matchOnly: true,
      kindLabel: why?.label ?? "Kept for matching",
      grounding: { where: p.kind, reason: why?.reason ?? null, confidence: null, by: why?.checkedAt ? `checked ${why.checkedAt.slice(0, 10)}` : null },
      remove: async () => {
        await deleteProperty(p.id);
        await refresh();
      },
    });
  }
  for (const e of exclusions.data ?? []) {
    groups.not_us.push({
      id: e.id,
      label: e.label ?? e.matchValue,
      url: e.url,
      kindLabel: null,
      thumb: e.matchKind === "url" && e.label === "Logo" && e.url ? e.url : undefined,
      remove: async () => {
        await removeBrandExclusion(e.id);
        await refresh();
      },
      undo: e.retraction
        ? async () => {
            await restoreRetraction(e.retraction as RetractionSummary);
            await clearStashedRetraction(e.id);
            await refresh();
            await queryClient.invalidateQueries();
          }
        : undefined,
    });
  }

  if (pendingAdd) {
    groups[pendingAdd.group].push({
      id: "pending-add", label: pendingAdd.label, url: null, kindLabel: null, pending: true, remove: async () => {},
    });
  }

  const options = [
    { key: ALIAS, label: "Another name" },
    ...(kinds.data ?? [])
      .filter((k) => k.key !== "ours" && k.key !== "irrelevant" && k.routesTo !== "brand_property")
      .map((k) => ({ key: k.key, label: k.label })),
  ];
  const chosenKind = kindByKey.get(choice);

  const add = async () => {
    const value = text.trim();
    if (!value) return;
    setAdding(true);
    setPendingAdd({
      label: value,
      group:
        choice === ALIAS ? "names"
        : choice === "competitor" ? "competitors"
        : chosenKind?.routesTo === "exclusion" ? "not_us"
        : groupOf(chosenKind, choice),
    });
    try {
      if (choice === ALIAS) {
        await patchProfile((p) => ({ ...p, brand_aliases: [...new Set([...profileAliases(p), value])] }));
      } else if (choice === "competitor") {
        const next = competitorFromText(value);
        await patchProfile((p) => ({
          ...p,
          competitors: [...(Array.isArray(p.competitors) ? p.competitors : []), next as unknown as Json],
        }));
      } else if (chosenKind?.routesTo === "exclusion") {
        await addBrandExclusion({ organizationId: brand.organization_id, brandId: brand.id, text: value });
        await refresh();
      } else {
        // A person (founder / key person) is linked or created in the CRM and associated to the brand
        // — the same path Create uses — and the relationship row records that party.
        const personRoute = chosenKind?.routesTo;
        const url = /^https?:\/\//i.test(value) ? value : null;
        const person = chosenKind && (personRoute === "owns" || personRoute === "key_person")
          ? await linkPersonToBrand(
              brand.organization_id,
              brand.id,
              url ? (host(url) ?? value) : value,
              { routesTo: personRoute, label: chosenKind.label },
              { url },
              "brand_page",
            )
          : null;
        await addBrandRelation({
          organizationId: brand.organization_id,
          brandId: brand.id,
          text: value,
          relationKey: choice,
          sentiment: chosenKind?.hasSentiment ? sentiment : null,
          person,
        });
        await refresh();
      }
      setText("");
    } catch (error) {
      toast.error(`Could not add: ${extractErrorMessage(error)}`);
    } finally {
      setAdding(false);
      setPendingAdd(null);
    }
  };

  const loading = relations.isLoading || exclusions.isLoading;
  const failed = relations.error ?? exclusions.error ?? kinds.error;
  const filled = (Object.keys(GROUP_TITLES) as GroupKey[]).filter((k) => groups[k].length > 0);

  return (
    <SectionCard title="Relationships" anchor="relationships" className="scroll-mt-24">
      <div className="grid gap-3 p-3" data-testid="brand-relations">
        {failed ? <ErrorNotice error={failed} operation="Load brand relationships" size="compact" /> : null}
        {loading ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading
          </p>
        ) : filled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No names, people or related pages yet.</p>
        ) : (
          // Every group has its own fixed column, so adding or removing one never moves another (layout shift = 0).
          <div className="grid gap-x-6 gap-y-0 md:grid-cols-2 xl:grid-cols-3">
            {COLUMNS.map((column, i) => (
              <div key={i} className={`grid min-w-0 content-start gap-3 [&:not(:empty)]:mb-3 ${COLUMN_PLACE[i]}`}>
                {column.filter((key) => groups[key].length > 0).map((key) => (
                  <section key={key} className="min-w-0">
                    <h4 className="mb-1 flex items-center gap-1.5 px-1.5 text-xs font-medium text-muted-foreground">
                      {GROUP_TITLES[key]}
                      <span className="tabular-nums">{groups[key].length}</span>
                    </h4>
                    <ul className="grid min-w-0 grid-cols-1">
                      {groups[key].map((row) => (
                        <RelationRowView key={row.id} row={row} canEdit={canEdit} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ))}
          </div>
        )}
        {canEdit ? (
          <form
            className="flex flex-wrap items-center gap-2 border-t border-border pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            {/* ui-exception: a raw value (a name or an address), not prose */}
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Name or link"
              className="min-w-48 flex-1"
              aria-label="Name or link"
            />
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger className="w-52" aria-label="Relationship">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chosenKind?.hasSentiment ? (
              <Select value={sentiment} onValueChange={(v) => setSentiment(v as typeof sentiment)}>
                <SelectTrigger className="w-32" aria-label="Sentiment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <Button type="submit" variant="quiet" icon={adding ? <Loader2 className="animate-spin" /> : <Plus />} disabled={adding || !text.trim()}>
              Add
            </Button>
          </form>
        ) : null}
      </div>
    </SectionCard>
  );
}
