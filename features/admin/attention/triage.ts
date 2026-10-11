/**
 * Triage — who each dock item is for, whether it is ready, and the card budget. The PURE half.
 *
 * THE DEFECT THIS EXISTS FOR (Arman, 2026-10-11): "they bombard me so the important things get
 * missed. Right now my notification system says 27 things are pending. When there are that many
 * and many don't tell me anything, it's a complete waste of my time, I stop looking, and
 * eventually I turn the feature off."
 *
 * The DATABASE decides, once, for this dock and for the agents' `attention` MCP tool
 * (`platform.attention_card`): every item gets an audience — owner_decision / agent_fix /
 * info_only — and an owner decision reaches the card only when it passes the readiness gate (one
 * plain sentence, evidence, ONE recommended action with its consequence, no duplicate, not stale).
 * The card holds at most `platform.attention.card_budget` items; everything else is "being
 * prepared by agents", a muted count — never a bigger number.
 *
 * This file only reads the verdicts and applies them to the items the sources built.
 */

import type { AttentionItem } from "./types";

export type AttentionAudience = "owner_decision" | "agent_fix" | "info_only";
export type AttentionRoute = "owner_card" | "over_budget" | "agent_fix" | "info_only" | "muted";

/** KNOB MIRROR of platform.feature_knob "platform.attention" "card_budget" — used only when the
 * triage read failed, so the card still never shows more than this many. */
export const FALLBACK_CARD_BUDGET = 5;

export interface TriageVerdict {
  itemKey: string;
  source: string;
  kind: string;
  title: string;
  audience: AttentionAudience;
  routedTo: AttentionRoute;
  ready: boolean | null;
  notReadyReason: string | null;
  cardRank: number | null;
  /** The sentence the card shows: an agent's prepared one when there is one. */
  sentence: string | null;
  sentencePrepared: boolean;
  recommendedAction: string | null;
}

export interface AttentionTriage {
  budget: number;
  ownerOnCard: number;
  overBudget: number;
  preparedByAgents: number;
  infoOnly: number;
  verdicts: Map<string, TriageVerdict>;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const AUDIENCES = new Set<AttentionAudience>(["owner_decision", "agent_fix", "info_only"]);
const ROUTES = new Set<AttentionRoute>(["owner_card", "over_budget", "agent_fix", "info_only", "muted"]);

/** `platform.attention_card()` jsonb → verdicts. Garbage-safe: an unknown route never reaches the card. */
export function parseTriage(raw: unknown): AttentionTriage {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const verdicts = new Map<string, TriageVerdict>();
  for (const entry of Array.isArray(obj.items) ? obj.items : []) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const itemKey = str(e.item_key);
    if (!itemKey) continue;
    const audience = AUDIENCES.has(e.audience as AttentionAudience) ? (e.audience as AttentionAudience) : "agent_fix";
    const routedTo = ROUTES.has(e.routed_to as AttentionRoute) ? (e.routed_to as AttentionRoute) : "agent_fix";
    verdicts.set(itemKey, {
      itemKey,
      source: str(e.source) ?? itemKey.split(":")[0],
      kind: str(e.kind) ?? "*",
      title: str(e.title) ?? "",
      audience,
      routedTo,
      ready: typeof e.ready === "boolean" ? e.ready : null,
      notReadyReason: str(e.not_ready_reason),
      cardRank: typeof e.card_rank === "number" ? e.card_rank : null,
      sentence: str(e.sentence),
      sentencePrepared: e.sentence_prepared === true,
      recommendedAction: str(e.recommended_action),
    });
  }
  return {
    budget: Math.max(1, num(obj.budget, FALLBACK_CARD_BUDGET)),
    ownerOnCard: num(obj.owner_on_card),
    overBudget: num(obj.over_budget),
    preparedByAgents: num(obj.prepared_by_agents),
    infoOnly: num(obj.info_only),
    verdicts,
  };
}

/**
 * The item as the card shows it: the prepared sentence when an agent wrote one, and the
 * recommended action first (primary), the rest after it. Nothing is dropped from the row.
 */
export function asCardItem(item: AttentionItem, verdict: TriageVerdict): AttentionItem {
  const sentence = verdict.sentencePrepared && verdict.sentence ? verdict.sentence : item.sentence;
  const rec = verdict.recommendedAction;
  const actions = rec
    ? [
        ...item.actions.filter((a) => a.id === rec).map((a) => ({ ...a, variant: "default" as const })),
        ...item.actions.filter((a) => a.id !== rec),
      ]
    : item.actions;
  return { ...item, sentence, actions };
}
