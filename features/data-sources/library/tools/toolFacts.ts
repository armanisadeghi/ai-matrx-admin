/**
 * Facts a Tool card states, in the words a person reads (third-party services lane L7). Pure.
 * A Tool is named by what it does — never by who serves it (CONTRACT §13; R-1).
 */

import { formatCount, formatDurationMs } from "@ai-matrx/kit/format";
import {
  BarChart3,
  Building2,
  Clapperboard,
  Database,
  Globe2,
  Link2,
  Megaphone,
  MessagesSquare,
  Search,
  ShoppingBag,
  Eye,
  Star,
  UserSearch,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CatalogReliability } from "@ai-matrx/agents/tools";

export interface JobFamilyFacts {
  slug: string;
  /** What a person calls it. */
  label: string;
  icon: LucideIcon;
}

/** The job families of CONTRACT §3b, in the order the home shows them. */
export const JOB_FAMILIES: readonly JobFamilyFacts[] = [
  { slug: "seo", label: "SEO & backlinks", icon: Link2 },
  { slug: "people", label: "People", icon: UserSearch },
  { slug: "company", label: "Companies", icon: Building2 },
  { slug: "social", label: "Social media", icon: MessagesSquare },
  { slug: "ads", label: "Ad research", icon: Megaphone },
  { slug: "search", label: "Web search", icon: Search },
  { slug: "reviews", label: "Reviews", icon: Star },
  { slug: "ai_visibility", label: "AI visibility", icon: Eye },
  { slug: "market", label: "Market data", icon: BarChart3 },
  { slug: "ecommerce", label: "Products & shops", icon: ShoppingBag },
  { slug: "generation", label: "Images, video & voice", icon: Clapperboard },
  { slug: "data_library", label: "Data sources", icon: Database },
  { slug: "public_data", label: "Public data", icon: Globe2 },
];

const BY_SLUG = new Map(JOB_FAMILIES.map((f) => [f.slug, f]));

export function jobFamilyOf(slug: string | null | undefined): JobFamilyFacts {
  return (slug ? BY_SLUG.get(slug) : undefined) ?? { slug: slug ?? "other", label: "Other", icon: Wrench };
}

/** Under this many runs a success rate says nothing, so the card says "New" instead of a percent. */
export const MIN_RUNS_FOR_RATE = 5;

export interface ReliabilityFacts {
  /** "98% worked" or "New". */
  headline: string;
  /** "214 runs" — the sample size the percent rests on. */
  sample: string | null;
  tone: "success" | "warning" | "danger" | "neutral";
}

export function reliabilityFacts(r: CatalogReliability): ReliabilityFacts {
  if (r.success_rate == null || r.samples < MIN_RUNS_FOR_RATE) {
    return { headline: "New", sample: r.samples > 0 ? `${r.samples} ${r.samples === 1 ? "run" : "runs"}` : null, tone: "neutral" };
  }
  const pct = Math.round(r.success_rate * 100);
  const tone = pct >= 90 ? "success" : pct >= 70 ? "warning" : "danger";
  return { headline: `${pct}% worked`, sample: `${formatCount(r.samples, { locale: "en-US" })} runs`, tone };
}

/** The typical wait: "~0.8 s", "~12 s", "~2 min". Null when nobody has timed it. */
export function speedText(p50Ms: number | null): string | null {
  if (p50Ms == null || p50Ms <= 0) return null;
  return `~${formatDurationMs(p50Ms, { style: p50Ms < 90_000 ? "compact" : "coarse" })}`;
}

/** Values the person typed, minus the empty ones: what the call sends. */
export function inputsToSend(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[name] = typeof value === "string" ? value.trim() : value;
  }
  return out;
}

/** Verdict line above the grid. Null when the answer needs no comment. */
export function verdictLine(verdict: "strong" | "closest" | "none" | null, query: string): string | null {
  if (!query.trim()) return null;
  if (verdict === "closest") return "Nothing matches exactly. These are closest.";
  return null;
}

/**
 * What a stored call page puts back in the form: the inputs of the call named in the address, once.
 * Null when there is nothing to refill (no stored call, the shown call is another one, the server
 * sent no inputs, or this call was already refilled).
 */
export function refillFor(
  callId: string | null,
  view: { call_id: string; inputs?: Record<string, unknown> | null } | null,
  alreadyRefilled: string | null,
): Record<string, unknown> | null {
  if (!callId || !view || view.call_id !== callId || alreadyRefilled === callId) return null;
  return view.inputs ?? null;
}

/** Words that only a tester writes: a sentence holding one is an internal note, never for a member. */
const INTERNAL_NOTE = /\b(last live test|live test|sign-in wall|login wall|captcha|census|probe[ds]?|uninvoked|unverified|known issue|proof|scopes?|oauth|mcp|hit a [a-z-]+ wall|blocked|our account|last (?:live )?test|rate[- ]limited|trap)\b/i;

/**
 * A Tool's summary for a member: internal test notes are cut, and a note means the Tool may be flaky, which
 * reads as one plain status ("May not work right now"). An admin's debug view passes `admin` and sees it raw.
 */
export function memberSummary(summary: string, admin = false): { text: string; flagged: boolean } {
  if (admin) return { text: summary, flagged: false };
  const sentences = summary.match(/[^.!?]+[.!?]*\s*/g) ?? [summary];
  const kept = sentences.filter((sentence) => !INTERNAL_NOTE.test(sentence));
  return { text: kept.join("").trim(), flagged: kept.length !== sentences.length };
}

/** One row per job: the same job listed twice (one job key, or two sources sharing one name) shows once, the first. */
export function dedupeByJob<T extends { job_key: string; display_name?: string }>(hits: readonly T[]): T[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const name = (hit.display_name ?? "").trim().toLowerCase();
    if (seen.has(hit.job_key) || (name && seen.has(`name:${name}`))) return false;
    seen.add(hit.job_key);
    if (name) seen.add(`name:${name}`);
    return true;
  });
}
