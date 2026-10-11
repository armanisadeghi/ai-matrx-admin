/**
 * The dock's whole honesty rests on the negative case: nothing live renders
 * nothing. Proven here, not by switching a live schedule off. And a mute —
 * on the row or in this browser — removes a row from the dock without
 * removing it from the world (`partitionItems` keeps it as `muted`).
 */

import { buildAttentionNotice, partitionItems, SECTION_LIMIT } from "../build-notice";
import type { AttentionItem, AttentionSourceState } from "../types";

function item(over: Partial<AttentionItem> & { id: string }): AttentionItem {
  return {
    key: `s:${over.id}`,
    sourceId: "s",
    severity: "critical",
    title: over.id,
    state: "switched off 2 days ago",
    sentence: "has failed",
    about: null,
    record: null,
    doors: [],
    impactDeclared: null,
    actions: [],
    mute: { scope: "local", current: null, apply: async () => {}, clear: null },
    ...over,
  };
}

function source(over: Partial<AttentionSourceState> & { id: string }): AttentionSourceState {
  return {
    label: over.id,
    items: [],
    status: "ok",
    error: null,
    loud: true,
    summarize: () => null,
    review: null,
    refetch: () => {},
    ...over,
  };
}

const NOW = 1_700_000_000_000;

describe("buildAttentionNotice", () => {
  it("returns null when no source has a live item", () => {
    expect(buildAttentionNotice([source({ id: "a" }), source({ id: "b" })], {}, NOW)).toBeNull();
  });

  it("composes every source, worst first, and counts by severity", () => {
    const a = source({
      id: "a",
      summarize: (live) => `${live.length} scheduled jobs are switched off.`,
      items: [
        item({ id: "w", severity: "warning", state: "2 runs failed in a row" }),
        item({ id: "c1" }),
        item({ id: "c2" }),
      ],
    });
    const b = source({ id: "b", summarize: () => "Anthropic is down.", items: [item({ id: "o", key: "b:o", sourceId: "b" })] });
    const notice = buildAttentionNotice([a, b], {}, NOW);
    expect(notice).not.toBeNull();
    expect(notice!.tone).toBe("destructive");
    expect(notice!.criticalCount).toBe(3);
    expect(notice!.warningCount).toBe(1);
    expect(notice!.title).toBe("3 scheduled jobs are switched off. Anthropic is down.");
    expect(notice!.pill).toBe("4 things need a person");
    expect(notice!.sections.map((s) => s.source.id)).toEqual(["a", "b"]);
    expect(notice!.sections[0].items.map((i) => i.id)).toEqual(["c1", "c2", "w"]);
  });

  it("a warning-only dock is a warning, and one item is singular", () => {
    const notice = buildAttentionNotice(
      [source({ id: "a", items: [item({ id: "w", severity: "warning" })] })],
      {},
      NOW,
    );
    expect(notice!.tone).toBe("warning");
    expect(notice!.pill).toBe("1 thing needs a person");
  });

  it("a mute on the ROW hides the item from the dock until it ends", () => {
    const muted = item({
      id: "m",
      mute: {
        scope: "server",
        current: { until: new Date(NOW + 1000).toISOString(), reason: "unbuilt", by: "admin" },
        apply: async () => {},
        clear: async () => {},
      },
    });
    const live = item({ id: "l" });
    const src = source({ id: "a", items: [muted, live] });
    expect(buildAttentionNotice([src], {}, NOW)!.sections[0].items.map((i) => i.id)).toEqual(["l"]);
    // …and once the mute has run out the row is back, no reload required.
    expect(buildAttentionNotice([src], {}, NOW + 1001)!.sections[0].items.map((i) => i.id)).toEqual(["m", "l"]);
    expect(partitionItems([muted, live], {}, NOW).muted.map((i) => i.id)).toEqual(["m"]);
  });

  it("the title counts LIVE items only — a muted row never inflates the headline", () => {
    const muted = item({ id: "m" });
    const live = item({ id: "l" });
    const src = source({
      id: "a",
      items: [muted, live],
      summarize: (rows) => `${rows.length} scheduled jobs are switched off.`,
    });
    expect(buildAttentionNotice([src], { "s:m": NOW + 10 }, NOW)!.title).toBe("1 scheduled jobs are switched off.");
  });

  it("a LOCAL mute hides the item too, and an expired one is not honoured", () => {
    const only = item({ id: "o" });
    const src = source({ id: "a", items: [only] });
    expect(buildAttentionNotice([src], { "s:o": NOW + 10 }, NOW)).toBeNull();
    expect(buildAttentionNotice([src], { "s:o": NOW - 10 }, NOW)).not.toBeNull();
  });
  it("info rows are listed last and counted apart: they never make the dock red or say 'needs a person'", () => {
    const src = source({
      id: "a",
      items: [item({ id: "i", severity: "info" }), item({ id: "w", severity: "warning" })],
    });
    const notice = buildAttentionNotice([src], {}, NOW)!;
    expect(notice.sections[0].items.map((i) => i.id)).toEqual(["w", "i"]);
    expect(notice.infoCount).toBe(1);
    expect(notice.pill).toBe("1 thing needs a person · 1 to know");
    const infoOnly = buildAttentionNotice([source({ id: "b", items: [item({ id: "i", severity: "info" })] })], {}, NOW)!;
    expect(infoOnly.tone).toBe("warning");
    expect(infoOnly.pill).toBe("1 thing to know");
  });

  it("a long source shows its worst rows and says how many more wait on its review page", () => {
    const many = Array.from({ length: 30 }, (_, n) =>
      item({ id: `r${n}`, severity: n < 3 ? "info" : n < 10 ? "warning" : "critical" }),
    );
    const notice = buildAttentionNotice([source({ id: "a", items: many })], {}, NOW)!;
    const section = notice.sections[0];
    expect(section.items).toHaveLength(SECTION_LIMIT);
    expect(section.items.every((i) => i.severity === "critical")).toBe(true);
    expect(section.hidden).toBe(30 - SECTION_LIMIT);
    // The counts stay whole: the cap shortens the card, never the truth.
    expect(notice.criticalCount + notice.warningCount + notice.infoCount).toBe(30);
  });
});

