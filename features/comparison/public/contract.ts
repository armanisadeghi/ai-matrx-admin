/**
 * The public comparison page's wire shape (aidream `GET /comparison/public/s/{slug}`): exactly what the
 * page renders — the ranked result with ids and spend blanked, a title and description, when the facts
 * were fetched, the typed inputs a signed-in Refresh re-runs, and the policy knobs. No sign-in needed.
 */

import { parseResult, type ComparisonItemInput, type ComparisonResult } from "../contract";

export interface PublicPolicy {
  viewRequiresAccount: boolean;
  runRequiresAccount: boolean;
  refreshRequiresAccount: boolean;
  indexable: boolean;
}

export interface PublicComparison {
  slug: string;
  title: string;
  description: string;
  kind: string;
  kindLabel: string;
  fetchedAt: string | null;
  sharedAt: string | null;
  result: ComparisonResult;
  refreshItems: ComparisonItemInput[];
  policy: PublicPolicy;
}

const o = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const s = (v: unknown): string => (typeof v === "string" ? v : "");
const sn = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const b = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

export function parsePublicPolicy(raw: unknown): PublicPolicy {
  const p = o(raw);
  // an unreadable policy fails CLOSED toward accounts for running, open for viewing (the owner's defaults)
  return {
    viewRequiresAccount: b(p.view_requires_account, false),
    runRequiresAccount: b(p.run_requires_account, true),
    refreshRequiresAccount: b(p.refresh_requires_account, true),
    indexable: b(p.indexable, true),
  };
}

export function parsePublicComparison(raw: unknown): PublicComparison | null {
  const d = o(raw);
  const result = parseResult(d.result);
  if (!result || !s(d.slug)) return null;
  const items = Array.isArray(d.refresh_items) ? d.refresh_items : [];
  return {
    slug: s(d.slug),
    title: s(d.title) || `${result.kind_label} comparison`,
    description: s(d.description),
    kind: s(d.kind),
    kindLabel: s(d.kind_label) || result.kind_label,
    fetchedAt: sn(d.fetched_at),
    sharedAt: sn(d.shared_at),
    result,
    refreshItems: items.map((v): ComparisonItemInput => {
      const i = o(v);
      return {
        label: sn(i.label), url: sn(i.url), website: sn(i.website), logo_url: sn(i.logo_url),
        inputs: i.inputs && typeof i.inputs === "object" ? (i.inputs as Record<string, unknown>) : null,
      };
    }),
    policy: parsePublicPolicy(d.policy),
  };
}
