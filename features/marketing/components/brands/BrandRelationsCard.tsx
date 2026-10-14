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
import { Button, Input } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import type { Json } from "@/types/database.types";
import { Favicon } from "@/features/research/components/overview/live-pipeline/ui/Favicon";
import { outboundHref } from "@/features/marketing/smart-add/SmartAddExtras";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { listBrandRelationKinds, updateBrand, type BrandRelationKind } from "@/features/marketing/data/service";
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
import { isJsonRecord, type MarketingBrand } from "@/features/marketing/types";
import { linkPersonToBrand } from "@/features/marketing/smart-add/relations";

type GroupKey = "names" | "people" | "related" | "competitors" | "about" | "not_us";

const GROUP_TITLES: Record<GroupKey, string> = {
  names: "Other names",
  people: "People",
  related: "Related companies",
  competitors: "Competitors",
  about: "Listings, reviews, mentions",
  not_us: "Not us",
};

const ALIAS = "__alias";

interface Row {
  id: string;
  label: string;
  url: string | null;
  kindLabel: string | null;
  /** A Not us logo: the removed image itself, so the row says which logo it is. */
  thumb?: string;
  sentiment?: BrandRelationRow["sentiment"];
  grounding?: { where: string | null; reason: string | null; confidence: number | null; by: string | null };
  remove: () => Promise<void>;
  /** A Not us entry made by a removal: bring back what the removal took (web.decision_retraction_restore). */
  undo?: () => Promise<void>;
}

function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-success",
  neutral: "bg-muted-foreground",
  negative: "bg-destructive",
};

function RelationRowView({ row, canEdit }: { row: Row; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const h = host(row.url);
  const g = row.grounding;
  const hasGrounding = Boolean(g && (g.where || g.reason || g.confidence != null));
  const body = (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {row.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxiedExternalImageUrl(row.thumb)} alt="" className="size-5 shrink-0 rounded object-contain" data-testid="brand-relation-thumb" />
      ) : row.url ? (
        <Favicon hostname={h} size={16} />
      ) : null}
      <span className="truncate text-sm text-foreground">{row.label}</span>
      {h && !row.thumb && h !== row.label ? <span className="hidden truncate text-xs text-muted-foreground sm:inline">{h}</span> : null}
      {row.sentiment ? (
        <span className={`size-1.5 shrink-0 rounded-full ${SENTIMENT_DOT[row.sentiment] ?? ""}`} aria-label={row.sentiment} />
      ) : null}
      {row.kindLabel ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{row.kindLabel}</span> : null}
    </span>
  );
  return (
    <li className="group flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted/50" data-testid="brand-relation-row">
      {hasGrounding ? (
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>{body}</HoverCardTrigger>
          <HoverCardContent className="w-72 space-y-1 text-xs">
            {g?.reason ? <p>{g.reason}</p> : null}
            {g?.where ? <p className="text-muted-foreground">{g.where}</p> : null}
            {g?.confidence != null ? <p className="text-muted-foreground">{Math.round(g.confidence * 100)}% sure</p> : null}
            {g?.by === "person" ? <p className="text-muted-foreground">Confirmed by a person</p> : null}
          </HoverCardContent>
        </HoverCard>
      ) : (
        body
      )}
      {row.url ? (
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
  if (kind.routesTo === "owns" || kind.routesTo === "key_person") return "people";
  if (kind.stance === "competitor") return "competitors";
  if (kind.stance === "about_us" || kind.stance === "ours") return "about";
  return "related";
}

export function BrandRelationsCard({ brand, canEdit }: { brand: MarketingBrand; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const kinds = useQuery({ queryKey: ["marketing", "brand-relation-kinds"], queryFn: listBrandRelationKinds, staleTime: 5 * 60_000 });
  const relations = useQuery({ queryKey: ["marketing", "brand-relations", brand.id], queryFn: () => listBrandRelations(brand.id) });
  const exclusions = useQuery({ queryKey: ["marketing", "brand-exclusions", brand.id], queryFn: () => listBrandExclusions(brand.id) });
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<string>("competitor");
  const [sentiment, setSentiment] = useState<"positive" | "neutral" | "negative">("neutral");
  const [adding, setAdding] = useState(false);

  const kindByKey = new Map((kinds.data ?? []).map((k) => [k.key, k]));
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand-relations", brand.id] }),
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand-exclusions", brand.id] }),
      queryClient.invalidateQueries({ queryKey: ["marketing", "brand", brand.id] }),
    ]);
  };

  const patchProfile = async (edit: (profile: Record<string, Json>) => Record<string, Json>) => {
    const current = (isJsonRecord(brand.profile) ? { ...brand.profile } : {}) as Record<string, Json>;
    await updateBrand({ brandId: brand.id, expectedVersion: brand.version, patch: { profile: edit(current) as Json } });
    await refresh();
  };

  const groups: Record<GroupKey, Row[]> = { names: [], people: [], related: [], competitors: [], about: [], not_us: [] };
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
      url: c.domain ? `https://${c.domain}` : null,
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
    groups[groupOf(kind, r.relationKey)].push({
      id: r.id,
      label: r.label,
      url: r.url,
      kindLabel: kind?.label ?? r.relationKey,
      sentiment: kind?.hasSentiment ? r.sentiment : null,
      grounding: { where: r.where, reason: r.reason, confidence: r.confidence, by: r.answeredBy },
      remove: async () => {
        await removeBrandRelation(r.id);
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
    }
  };

  const loading = relations.isLoading || exclusions.isLoading;
  const failed = relations.error ?? exclusions.error ?? kinds.error;
  const filled = (Object.keys(GROUP_TITLES) as GroupKey[]).filter((k) => groups[k].length > 0);

  return (
    <SectionCard title="Relationships" anchor="relationships">
      <div className="grid gap-3" data-testid="brand-relations">
        {failed ? <p className="text-sm text-destructive">{extractErrorMessage(failed)}</p> : null}
        {loading ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading
          </p>
        ) : filled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No names, people or related pages yet.</p>
        ) : (
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
            {filled.map((key) => (
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
