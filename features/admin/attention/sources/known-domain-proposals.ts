/**
 * Known-domain proposals as attention items — the PURE half of the source.
 *
 * The known-domain registry (web.domain_category, lib/web-domains) learns on write. What it could not
 * settle by itself lands here for a platform admin: answers that disagree about a host, a host with too
 * few answers, or a sibling domain proposed by its name ("pressrelease" → press release wire). Approve
 * adds it for everyone; reject keeps it from being proposed again.
 */

import type { DomainProposal } from "@/lib/web-domains/service";
import type { AttentionItem } from "../types";

export const KNOWN_DOMAIN_SOURCE_ID = "known-domains";
export const KNOWN_DOMAIN_SOURCE_LABEL = "Known web domains";

export interface KnownDomainDeps {
  decide: (id: string, approve: boolean) => Promise<void>;
  muteLocally: (key: string, ms: number) => void;
  unmuteLocally: (key: string) => void;
  now?: number;
}

function stateOf(p: DomainProposal): string {
  if (p.provenance === "pattern") return "name match";
  if (p.note?.startsWith("Answers disagree")) return "answers disagree";
  return `${p.evidenceCount} answers`;
}

export function knownDomainItems(proposals: readonly DomainProposal[], deps: KnownDomainDeps): AttentionItem[] {
  const now = deps.now ?? Date.now();
  return proposals.map((p) => {
    const key = `${KNOWN_DOMAIN_SOURCE_ID}:${p.id}`;
    const from = p.sources.length ? ` From ${p.sources.join(", ").replace(/_/g, " ")}.` : "";
    return {
      key,
      sourceId: KNOWN_DOMAIN_SOURCE_ID,
      id: p.id,
      severity: p.note?.startsWith("Answers disagree") ? ("warning" as const) : ("info" as const),
      title: `${p.host} → ${p.categoryLabel}`,
      state: stateOf(p),
      sentence: `${p.note ?? "Proposed."}${from}`,
      about: null,
      record: null,
      doors: [{ kind: "evidence" as const, href: `https://${p.host}`, label: p.host, what: "The site itself." }],
      impactDeclared: null,
      actions: [
        { id: "approve", label: "Approve", run: () => deps.decide(p.id, true) },
        { id: "reject", label: "Reject", variant: "outline" as const, run: () => deps.decide(p.id, false) },
      ],
      mute: {
        scope: "local" as const,
        current: null,
        apply: async (untilMs: number) => {
          deps.muteLocally(key, Math.max(0, untilMs - now));
        },
        clear: async () => {
          deps.unmuteLocally(key);
        },
      },
    };
  });
}

export function summarizeKnownDomains(items: readonly AttentionItem[]): string | null {
  if (items.length === 0) return null;
  return items.length === 1 ? "A web domain is waiting to be approved." : `${items.length} web domains are waiting to be approved.`;
}
