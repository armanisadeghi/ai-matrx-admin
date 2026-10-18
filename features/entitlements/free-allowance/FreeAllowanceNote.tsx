"use client";

/**
 * The free allowance, said by the action (FREE-ALLOWANCE.md §6): "3 free today", "1 left today",
 * "Sign up free for more". Read from aidream `GET /billing/free-allowance/features/{feature}` (memory
 * only, never reserves). Paid people and anything not known yet render NOTHING — never a zero.
 */

import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/python-client";

export interface FreeAllowance {
  feature: string;
  tier: "guest" | "free" | "paid";
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resets_at: string | null;
  enforced: boolean;
}

export function parseFreeAllowance(raw: unknown): FreeAllowance | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const tier = r.tier === "guest" || r.tier === "free" ? r.tier : "paid";
  return {
    feature: String(r.feature ?? ""),
    tier,
    limit: num(r.limit),
    used: num(r.used),
    remaining: num(r.remaining),
    resets_at: typeof r.resets_at === "string" ? r.resets_at : null,
    enforced: r.enforced === true,
  };
}

/** One short line, or null when there is nothing honest to say. */
export function freeAllowanceLine(a: FreeAllowance | null): { text: string; href?: string } | null {
  if (!a || a.tier === "paid" || a.limit === null || a.remaining === null) return null;
  if (a.limit === 0 || a.remaining === 0) {
    return a.tier === "guest"
      ? { text: "Sign up free for more", href: "/sign-up" }
      : { text: "Upgrade for more", href: "/pricing" };
  }
  return { text: a.remaining === a.limit ? `${a.limit} free today` : `${a.remaining} left today` };
}

export function useFreeAllowance(feature: string, refreshKey?: unknown): FreeAllowance | null {
  const q = useQuery({
    queryKey: ["free-allowance", feature, refreshKey],
    queryFn: async ({ signal }) => {
      const { data } = await getJson<unknown>(`/billing/free-allowance/features/${encodeURIComponent(feature)}`, { signal });
      return parseFreeAllowance(data);
    },
    staleTime: 30_000,
    retry: false,
  });
  return q.data ?? null;
}

export function FreeAllowanceNote({ feature, refreshKey }: { feature: string; refreshKey?: unknown }) {
  const line = freeAllowanceLine(useFreeAllowance(feature, refreshKey));
  if (!line) return null;
  if (line.href) {
    return (
      <a href={line.href} target="_blank" rel="noopener noreferrer"
        className="type-secondary font-medium text-primary underline-offset-4 hover:underline">
        {line.text}
      </a>
    );
  }
  return <span className="type-secondary tabular-nums text-muted-foreground">{line.text}</span>;
}
