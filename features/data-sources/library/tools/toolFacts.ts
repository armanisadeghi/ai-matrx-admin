/**
 * Facts a Tool card states, in the words a person reads (third-party services lane L7). Pure.
 * A Tool is named by what it does — never by who serves it (CONTRACT §13; R-1).
 */

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
  Sparkle,
  Star,
  UserSearch,
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
  { slug: "ai_visibility", label: "AI visibility", icon: Sparkle },
  { slug: "market", label: "Market data", icon: BarChart3 },
  { slug: "ecommerce", label: "Products & shops", icon: ShoppingBag },
  { slug: "generation", label: "Images, video & voice", icon: Clapperboard },
  { slug: "data_library", label: "Data sources", icon: Database },
  { slug: "public_data", label: "Public data", icon: Globe2 },
];

const BY_SLUG = new Map(JOB_FAMILIES.map((f) => [f.slug, f]));

export function jobFamilyOf(slug: string | null | undefined): JobFamilyFacts {
  return (slug ? BY_SLUG.get(slug) : undefined) ?? { slug: slug ?? "other", label: "Other", icon: Database };
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
  return { headline: `${pct}% worked`, sample: `${r.samples.toLocaleString("en-US")} runs`, tone };
}

/** The typical wait: "~0.8 s", "~12 s", "~2 min". Null when nobody has timed it. */
export function speedText(p50Ms: number | null): string | null {
  if (p50Ms == null || p50Ms <= 0) return null;
  if (p50Ms < 10_000) return `~${(p50Ms / 1000).toFixed(1)} s`;
  if (p50Ms < 90_000) return `~${Math.round(p50Ms / 1000)} s`;
  return `~${Math.round(p50Ms / 60_000)} min`;
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
