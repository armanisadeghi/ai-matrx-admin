/**
 * THE usage-class rule for everything found about a brand (Arman, 2026-10-15) — the one place every
 * marketing consumer and every matching consumer asks "may I use this?".
 *
 *   use        → shown on brand surfaces and fed to marketing work (SEO, content, social, agents)
 *   match_only → ours, but never shown or used: a former address, a misspelling, a wrong listing, a dead
 *                link. Kept ONLY as an identity signal for matching, dedupe and finding the brand.
 *   undecided  → "Maybe": not used, not shown on marketing surfaces, stays in review.
 *
 * The class lives on the relationship vocabulary (`web.brand_relation_kind.usage`). A brand account or
 * site (`web.property`) carries it through its status: `active` is the only marketing status; a property
 * whose link is dead is `match_only`, with `metadata.relation = {key, label, reason, checked_at}`.
 * Server twin: aidream `aidream/services/brand_profile/usage.py` (same words, same rule).
 */

export type RelationUsage = "use" | "match_only" | "undecided";

export const RELATION_USAGES: readonly RelationUsage[] = ["use", "match_only", "undecided"];

/** The only property status marketing reads. */
export const MARKETING_PROPERTY_STATUS = "active";
/** A property kept for matching only (a dead link, a former account). */
export const MATCH_ONLY_PROPERTY_STATUS = "match_only";

/** The menu group a non-`use` kind reads under, instead of its stance group. */
export const USAGE_GROUP_LABEL: Record<Exclude<RelationUsage, "use">, string> = {
  match_only: "Kept for matching",
  undecided: "Not sure",
};

export function toRelationUsage(value: unknown): RelationUsage {
  return RELATION_USAGES.includes(value as RelationUsage) ? (value as RelationUsage) : "use";
}

/** True when a relationship of this usage may be shown on a brand surface or fed to marketing work. */
export function isMarketingUsage(usage: RelationUsage | null | undefined): boolean {
  return (usage ?? "use") === "use";
}

/** A brand property marketing may show or use: status active only. */
export function isMarketingProperty(p: { status?: string | null; deleted_at?: string | null }): boolean {
  return !p.deleted_at && (p.status ?? MARKETING_PROPERTY_STATUS) === MARKETING_PROPERTY_STATUS;
}

/** The marketing read over a brand's properties. Matching / discovery reads every live property instead. */
export function marketingProperties<T extends { status?: string | null; deleted_at?: string | null }>(rows: readonly T[]): T[] {
  return rows.filter(isMarketingProperty);
}

/** Why a property is kept for matching only (`metadata.relation`), or null when it is in use. */
export function propertyMatchOnlyReason(p: {
  status?: string | null;
  metadata?: unknown;
}): { key: string; label: string; reason: string | null; checkedAt: string | null } | null {
  if (isMarketingProperty(p)) return null;
  const meta = p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata) ? (p.metadata as Record<string, unknown>) : {};
  const rel = meta.relation && typeof meta.relation === "object" && !Array.isArray(meta.relation) ? (meta.relation as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    key: str(rel.key) ?? "match_only",
    label: str(rel.label) ?? "Kept for matching",
    reason: str(rel.reason),
    checkedAt: str(rel.checked_at),
  };
}

/** Relationship keys (web.brand_relation_kind) marketing must never read, from the loaded vocabulary. */
export function nonMarketingRelationKeys(kinds: readonly { key: string; usage: RelationUsage }[]): string[] {
  return kinds.filter((k) => !isMarketingUsage(k.usage)).map((k) => k.key);
}
