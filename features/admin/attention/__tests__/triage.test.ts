/**
 * The anti-noise card (Arman, 2026-10-11: "when there are that many and many don't tell me
 * anything ... I stop looking, and eventually I turn the feature off").
 *
 * The database decides audience and readiness (proven live in aidream
 * services/attention/tests/test_attention_triage_live.py); this proves the CARD obeys it: only
 * on-card owner decisions render, never more than the budget, overflow is a muted count and never
 * a bigger pill, a prepared sentence and the recommended action are what he sees, and a failed
 * triage read still caps the card.
 */

import { buildAttentionNotice } from "../build-notice";
import { asCardItem, FALLBACK_CARD_BUDGET, parseTriage } from "../triage";
import type { AttentionItem, AttentionSourceState } from "../types";

const NOW = 1_700_000_000_000;

function item(id: string, over: Partial<AttentionItem> = {}): AttentionItem {
  return {
    key: `spend-alarms:${id}`,
    sourceId: "spend-alarms",
    id,
    severity: "warning",
    title: id,
    state: "3 times",
    sentence: "raw sentence with 3f9c2a1e-1111-4222-8333-444455556666",
    about: null,
    record: null,
    doors: [],
    impactDeclared: null,
    actions: [
      { id: "resolve", label: "Resolve", run: async () => {} },
      { id: "approve", label: "Approve", run: async () => {} },
    ],
    mute: { scope: "server", current: null, apply: async () => {}, clear: null },
    ...over,
  };
}

function source(id: string, items: AttentionItem[], over: Partial<AttentionSourceState> = {}): AttentionSourceState {
  return {
    id,
    label: id,
    items,
    status: "ok",
    error: null,
    loud: true,
    summarize: (live) => (live.length ? `${live.length} for you.` : null),
    review: null,
    refetch: () => {},
    ...over,
  };
}

function verdict(id: string, routed: string, rank: number | null = null, extra: Record<string, unknown> = {}) {
  return {
    item_key: `spend-alarms:${id}`,
    source: "spend-alarms",
    kind: "spend_approval_hold",
    title: id,
    audience: routed === "info_only" ? "info_only" : routed === "agent_fix" ? "agent_fix" : "owner_decision",
    routed_to: routed,
    card_rank: rank,
    ...extra,
  };
}

describe("parseTriage", () => {
  it("is garbage-safe: an unknown route never reaches the card", () => {
    const t = parseTriage({ budget: 5, items: [{ item_key: "x:1", routed_to: "the_moon" }, null, 7, { nope: 1 }] });
    expect(t.verdicts.get("x:1")?.routedTo).toBe("agent_fix");
    expect(t.verdicts.size).toBe(1);
    expect(parseTriage(null).budget).toBe(FALLBACK_CARD_BUDGET);
  });
});

describe("the triaged card", () => {
  const seven = ["a", "b", "c", "d", "e", "f", "g"].map((id) => item(id));

  it("shows only owner_card items; agent_fix and info_only never render", () => {
    const triage = parseTriage({
      budget: 5,
      prepared_by_agents: 1,
      items: [verdict("a", "owner_card", 1), verdict("b", "agent_fix"), verdict("c", "info_only")],
    });
    const notice = buildAttentionNotice([source("spend-alarms", seven.slice(0, 3))], {}, NOW, triage);
    expect(notice?.sections.flatMap((s) => s.items).map((i) => i.id)).toEqual(["a"]);
    expect(notice?.pill).toBe("1 thing needs a person");
    expect(notice?.preparedByAgents).toBe(1);
  });

  it("holds the budget; overflow is a muted count, never a bigger pill", () => {
    const triage = parseTriage({
      budget: 5,
      prepared_by_agents: 2,
      items: seven.map((i, n) => verdict(i.id, n < 5 ? "owner_card" : "over_budget", n < 5 ? n + 1 : null)),
    });
    const notice = buildAttentionNotice([source("spend-alarms", seven)], {}, NOW, triage);
    const shown = notice?.sections.flatMap((s) => s.items) ?? [];
    expect(shown).toHaveLength(5);
    expect(notice?.pill).toBe("5 things need a person");
    expect(notice?.preparedByAgents).toBe(2);
  });

  it("returns null when nothing is ready for him, however much agents are fixing", () => {
    const triage = parseTriage({ budget: 5, prepared_by_agents: 22, items: seven.map((i) => verdict(i.id, "agent_fix")) });
    expect(buildAttentionNotice([source("spend-alarms", seven)], {}, NOW, triage)).toBeNull();
  });

  it("shows the prepared sentence and puts the recommended action first", () => {
    const triage = parseTriage({
      budget: 5,
      items: [
        verdict("a", "owner_card", 1, {
          sentence: "The weekly digest is waiting for you to approve its spend.",
          sentence_prepared: true,
          recommended_action: "approve",
        }),
      ],
    });
    const notice = buildAttentionNotice([source("spend-alarms", [item("a")])], {}, NOW, triage);
    const row = notice?.sections[0].items[0];
    expect(row?.sentence).toBe("The weekly digest is waiting for you to approve its spend.");
    expect(row?.actions.map((a) => a.id)).toEqual(["approve", "resolve"]);
    expect(row?.actions[0].variant).toBe("default");
  });

  it("keeps a fact (Spend today) only beside a decision, or when it is critical", () => {
    const fact = item("today", { key: "spend-today:t", sourceId: "spend-today", severity: "info" });
    const facts = source("spend-today", [fact], { counted: false });
    const none = parseTriage({ budget: 5, items: [] });
    expect(buildAttentionNotice([facts], {}, NOW, none)).toBeNull();
    const one = parseTriage({ budget: 5, items: [verdict("a", "owner_card", 1)] });
    const notice = buildAttentionNotice([source("spend-alarms", [item("a")]), facts], {}, NOW, one);
    expect(notice?.sections.map((s) => s.source.id)).toEqual(["spend-alarms", "spend-today"]);
    const critical = source("spend-today", [{ ...fact, severity: "critical" }], { counted: false });
    expect(buildAttentionNotice([critical], {}, NOW, none)).not.toBeNull();
  });

  it("a failed triage read still caps the card at the fallback budget", () => {
    const notice = buildAttentionNotice([source("spend-alarms", seven)], {}, NOW, "unavailable");
    expect(notice?.sections.flatMap((s) => s.items)).toHaveLength(FALLBACK_CARD_BUDGET);
    expect(notice?.preparedByAgents).toBe(seven.length - FALLBACK_CARD_BUDGET);
  });

  it("without triage (the review page) every live item is listed as before", () => {
    const notice = buildAttentionNotice([source("spend-alarms", seven)], {}, NOW);
    expect(notice?.sections[0].items).toHaveLength(seven.length);
    expect(notice?.preparedByAgents).toBe(0);
  });

  it("asCardItem never drops an action", () => {
    const v = parseTriage({ items: [verdict("a", "owner_card", 1, { recommended_action: "nope" })] }).verdicts.get("spend-alarms:a");
    if (!v) throw new Error("verdict missing");
    expect(asCardItem(item("a"), v).actions).toHaveLength(2);
  });
});
