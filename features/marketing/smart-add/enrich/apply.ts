/**
 * Enrich: write ONLY what the person confirmed on "Changes to your brand" (ENRICH.md §5).
 *
 * Every write carries the BRAND's organization (never the active one) and decision provenance, so each
 * item can be undone without poisoning data (UNDO.md):
 *   add account / website / other name / fact → the validation page's persistAnswer: a web.discovered_item
 *       decision (source smart_add, context.evidence_key) + its home, resolved_property_id / the `caused`
 *       association, and the same post / crawl ingest Create starts
 *   replace name                         → persistAnswer "preferred" (web.brand.name, with its decision)
 *   replace / add logo                   → a web.brand_asset (source discovered, provenance in notes) made primary
 *                                          + web.brand.logo_url; the old primary is kept (demoted), never deleted
 *   replace description / industry       → web.brand column, the earlier value kept for undo
 *   replace primary website              → persistAnswer "ours" (the site) + web.brand.website_url
 *   conflict → Remove from brand         → web.decision_retraction (root property / site / logo, Not us on: the
 *                                          brand's NO LIST); undo = web.decision_retraction_restore
 *   conflict → Keep it                   → nothing (nothing negative is recorded)
 */

import {
  createBrandAsset,
  deleteBrandAsset,
  updateBrand,
  updateBrandAsset,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { applyRetraction, restoreRetraction, type RetractionSummary } from "@/features/marketing/data/retraction";
import type { MarketingBrand } from "@/features/marketing/types";
import { extractErrorMessage } from "@/utils/errors";
import { persistAnswer, type PersistContext } from "../validate/persist";
import { focusFromEvidence } from "../validate/queue";
import type { Answer } from "../validate/queue";
import type { ChangeChoice, EnrichChange } from "./diff";
import type { BrandSnapshot } from "./known";

export interface AppliedChange {
  change: EnrichChange;
  ok: boolean;
  error: string | null;
  /** Homes written (`table:id`), for the Builder panel. */
  homes: string[];
  retraction: RetractionSummary | null;
  undo: (() => Promise<void>) | null;
}

function answerFor(change: EnrichChange): Answer | null {
  const i = change.next;
  if (!i) return null;
  if (i.field === "social" || i.field === "website") return "ours";
  if (i.field === "name") return change.nextDecision === "alias" ? "alias" : "preferred";
  if (i.field === "phone" || i.field === "email" || i.field === "address") return "correct";
  return null;
}

async function setLogo(ctx: PersistContext, snapshot: BrandSnapshot, change: EnrichChange): Promise<Omit<AppliedChange, "change" | "ok" | "error">> {
  const i = change.next;
  if (!i) throw new Error("No logo to use");
  const url = i.image_url ?? i.value;
  const brand = ctx.getBrand();
  const primary = change.slot === "logo";
  const demoted = primary ? snapshot.assets.filter((a) => (a.kind === "logo" || a.kind === "headshot") && a.is_primary) : [];
  for (const a of demoted) await updateBrandAsset({ assetId: a.id, expectedVersion: a.version, patch: { is_primary: false } });
  const asset = await createBrandAsset({
    organizationId: ctx.organizationId,
    brandId: brand.id,
    kind: brand.kind === "person" ? "headshot" : "logo",
    sourceUrl: url,
    title: i.label,
    // Decision provenance: where the run found it (the enrich review is the decision).
    notes: `Smart Add enrich · ${i.source.where ?? i.source.kind}${i.source.url ? ` · ${i.source.url}` : ""}`,
    isPrimary: primary,
    source: "discovered",
  });
  const before = brand.logo_url;
  if (primary) ctx.setBrand(await updateBrand({ brandId: brand.id, expectedVersion: brand.version, patch: { logo_url: url } }));
  return {
    homes: [`web.brand_asset:${asset.id}`, ...(primary ? [`web.brand.logo_url:${brand.id}`] : [])],
    retraction: null,
    undo: async () => {
      await deleteBrandAsset(asset.id);
      for (const a of demoted) await updateBrandAsset({ assetId: a.id, expectedVersion: a.version + 1, patch: { is_primary: true } });
      if (primary) {
        const latest = ctx.getBrand();
        ctx.setBrand(await updateBrand({ brandId: latest.id, expectedVersion: latest.version, patch: { logo_url: before } }));
      }
    },
  };
}

async function setBrandColumn(ctx: PersistContext, column: "description" | "industry" | "website_url", value: string) {
  const brand = ctx.getBrand();
  const before = brand[column];
  ctx.setBrand(await updateBrand({ brandId: brand.id, expectedVersion: brand.version, patch: { [column]: value } }));
  return async () => {
    const latest = ctx.getBrand();
    ctx.setBrand(await updateBrand({ brandId: latest.id, expectedVersion: latest.version, patch: { [column]: before } }));
  };
}

async function applyOne(
  ctx: PersistContext,
  snapshot: BrandSnapshot,
  kinds: BrandRelationKind[],
  change: EnrichChange,
): Promise<Omit<AppliedChange, "change" | "ok" | "error">> {
  if (change.kind === "conflict") {
    const f = change.current;
    if (!f) throw new Error("Nothing to remove");
    const root =
      f.ref.type === "property" ? { type: "property" as const, id: f.ref.id }
      : f.ref.type === "site" ? { type: "site" as const, id: f.ref.id }
      : f.ref.type === "brand" && f.ref.field === "logo" ? { type: "logo" as const, id: snapshot.brand.id }
      : null;
    if (!root) throw new Error("This one cannot be removed here");
    const summary = await applyRetraction(root.type, root.id, true);
    if (root.type === "logo") ctx.setBrand({ ...ctx.getBrand(), logo_url: null } as MarketingBrand);
    return { homes: [`retraction:${root.type}:${root.id}`], retraction: summary, undo: async () => void (await restoreRetraction(summary)) };
  }
  const i = change.next;
  if (!i) throw new Error("Nothing to apply");
  if (i.field === "logo") return setLogo(ctx, snapshot, change);
  if (change.slot === "description" || change.slot === "category") {
    const undo = await setBrandColumn(ctx, change.slot === "description" ? "description" : "industry", i.value);
    return { homes: [`web.brand.${change.slot === "description" ? "description" : "industry"}:${snapshot.brand.id}`], retraction: null, undo };
  }
  const answer = answerFor(change);
  if (!answer) throw new Error(`Cannot apply a ${i.field}`);
  const focus = focusFromEvidence(i, kinds, { ourHosts: [], ourAccounts: [], name: ctx.getBrand().name });
  if (!focus) throw new Error(`Cannot apply a ${i.field}`);
  const saved = await persistAnswer(ctx, focus, answer);
  let undoWebsite: (() => Promise<void>) | null = null;
  if (change.slot === "website") undoWebsite = await setBrandColumn(ctx, "website_url", i.url ?? i.value);
  return {
    homes: saved.homes,
    retraction: null,
    undo: async () => {
      if (undoWebsite) await undoWebsite();
      await saved.undo();
    },
  };
}

/** Apply the confirmed changes in order: removals first (a NO before a replacement logo), then the rest. */
export async function applyEnrichChanges(input: {
  snapshot: BrandSnapshot;
  changes: EnrichChange[];
  choices: Record<string, ChangeChoice>;
  kinds: BrandRelationKind[];
  onBrand: (brand: MarketingBrand) => void;
}): Promise<AppliedChange[]> {
  let brand = input.snapshot.brand;
  const ctx: PersistContext = {
    // Writes carry the brand's organization, never the active one.
    organizationId: input.snapshot.brand.organization_id,
    getBrand: () => brand,
    setBrand: (b) => {
      brand = b;
      input.onBrand(b);
    },
    kinds: input.kinds,
  };
  const chosen = input.changes.filter((c) => c.kind !== "unchanged" && (input.choices[c.id] ?? c.defaultChoice) === "apply");
  const ordered = [...chosen.filter((c) => c.kind === "conflict"), ...chosen.filter((c) => c.kind !== "conflict")];
  const out: AppliedChange[] = [];
  for (const change of ordered) {
    try {
      const done = await applyOne(ctx, input.snapshot, input.kinds, change);
      out.push({ change, ok: true, error: null, ...done });
    } catch (error) {
      out.push({ change, ok: false, error: extractErrorMessage(error), homes: [], retraction: null, undo: null });
    }
  }
  return out;
}
