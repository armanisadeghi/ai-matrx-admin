/**
 * Enrich · what a Smart Add session already knows goes into the run (the "Add what's new to it" action of
 * the duplicate-brand notice). The website and account the person typed or confirmed are their own answers:
 * confirmed on arrival, exactly like a checked known fact.
 */
import { resolveAccountInput } from "@/features/marketing/social/account-input";
import { customItem, type Decision, type EvidenceItem } from "../evidence";
import type { SmartAddPrefill } from "../smartAddUrl";
import type { EnrichSeed } from "./known";

export function carriedAnswers(carry: Pick<SmartAddPrefill, "website" | "social" | "platform">): { items: EvidenceItem[]; decisions: Record<string, Decision> } {
  const items: EvidenceItem[] = [];
  if (carry.website?.trim()) items.push(customItem("website", carry.website));
  if (carry.social?.trim()) {
    const parsed = resolveAccountInput({ text: carry.social, picked: carry.platform ?? null });
    if (parsed.status === "ok") items.push(customItem("social", parsed.url, { platform: parsed.platform, handle: parsed.handle, url: parsed.url, label: parsed.handle }));
  }
  return { items, decisions: Object.fromEntries(items.map((i) => [i.key, "yes" as Decision])) };
}

/** The seed with the carried answers added; a fact the brand already has keeps its own row. */
export function withCarried(seed: EnrichSeed, carry: Pick<SmartAddPrefill, "website" | "social" | "platform">): EnrichSeed {
  const carried = carriedAnswers(carry);
  const have = new Set(seed.items.map((i) => i.key));
  const fresh = carried.items.filter((i) => !have.has(i.key));
  if (!fresh.length) return seed;
  return {
    ...seed,
    items: [...seed.items, ...fresh],
    decisions: { ...seed.decisions, ...Object.fromEntries(fresh.map((i) => [i.key, "yes" as Decision])) },
  };
}
