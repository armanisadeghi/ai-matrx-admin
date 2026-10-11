/**
 * The harsh walk of 2026-10-10 ("Steve Jobs would call it shit"), as guards:
 *  - the list and the dock count spend alarms with ONE function over the same rows, so they agree;
 *  - the reader pages past PostgREST's 1,000-row cap;
 *  - every sentence reads as words: no ANSI, no key=value, no (snake_code), no uuid;
 *  - a Source in an alarm opens its own page, or reads "(deleted)".
 */
import {
  alarmAgentData,
  alarmCostLine,
  costLabel,
  alarmSentence,
  alarmSourceHref,
  alarmSourceTitle,
  fetchSpendAlarmRows,
  spendAlarmCounts,
  ROWS_PAGE,
  type SpendAlarmRecord,
} from "./spendAlarms";
import { spendAlarmItems, summarizeSpendAlarms } from "@/features/admin/attention/sources/spend-alarms";

const pages: unknown[][] = [];
const calls: Array<[number, number]> = [];
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      rpc: () => ({
        range: (from: number, to: number) => {
          calls.push([from, to]);
          return Promise.resolve({ data: pages.shift() ?? [], error: null });
        },
      }),
    }),
  },
}));

const U = "87a6e699-3622-4869-8843-d0867456c0dd";
const ORG = "39c38960-d30c-4840-b0c1-c9960de95582";
const NOW = Date.parse("2026-10-11T05:00:00Z");

const rec = (over: Partial<SpendAlarmRecord> = {}): SpendAlarmRecord => ({
  id: "r",
  kind: "protected_account_refusal",
  level: "critical",
  title: "Automated run tried to bill a protected account",
  detail: `Not run: this system run (mandate_key=hindsight.replay_judge) would run as, and bill, a protected account (${U}). Core system work runs as the Matrx System bot.`,
  rule: null,
  fix: null,
  subject_type: "protected_account",
  subject_id: U,
  subject_name: null,
  refs: { user_id: U, handler: "mandate:hindsight.replay_judge", mandate_key: "hindsight.replay_judge", organization_id: ORG },
  occurrence_count: 4,
  first_seen_at: "2026-10-11T04:00:00Z",
  last_seen_at: "2026-10-11T04:28:00Z",
  cost_usd: null,
  cost_avoided_usd: null,
  status: "open",
  snoozed_until: null,
  snooze_note: null,
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
  reopened_count: 0,
  refused: true,
  code_fix: null,
  person: null,
  names: { [U]: "admin@admin.com", "hindsight.replay_judge": "Hindsight Replay Judge", [ORG]: "Matrx System" },
  ...over,
});

function assertPlain(text: string) {
  expect(text).not.toMatch(/\u001b/);
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(text).not.toMatch(/\b[a-z]+_[a-z_]+=/);
  expect(text).not.toMatch(/\([a-z0-9]+(?:[_.][a-z0-9]+)+\)/);
  expect(text).not.toMatch(/\bNone\b/);
}

describe("the list and the dock agree", () => {
  const rows = [
    rec({ id: "a", level: "critical" }),
    rec({ id: "b", level: "warning", kind: "origin_unknown" }),
    rec({ id: "c", level: "info", kind: "source_intelligence_skipped" }),
    rec({ id: "d", level: "critical", status: "snoozed", snoozed_until: "2026-10-12T00:00:00Z" }),
    rec({ id: "e", level: "critical", status: "resolved" }),
    // a snooze that has run out rings again
    rec({ id: "f", level: "warning", status: "snoozed", snoozed_until: "2026-10-11T01:00:00Z" }),
  ];

  it("counts ringing records by effective level, muted apart, resolved never", () => {
    expect(spendAlarmCounts(rows, NOW)).toEqual({ critical: 1, warning: 2, info: 1, snoozed: 1 });
  });

  it("the dock's spend section says exactly those numbers", () => {
    const unresolved = rows.filter((r) => r.status !== "resolved").map((r) => ({
      ...r,
      snoozed_by: null,
      latest_occurrence_at: null,
      latest_occurrence_detail: null,
      task_enabled: null,
      task_title: null,
      approval_status: null,
    }));
    const deps = { setStatus: jest.fn(), decideApproval: jest.fn(), setTaskEnabled: jest.fn(), runTaskNow: jest.fn(), now: NOW };
    const items = spendAlarmItems(unresolved, deps);
    const live = items.filter((i) => !i.mute?.current);
    const c = spendAlarmCounts(rows, NOW);
    expect(live.filter((i) => i.severity === "critical").length).toBe(c.critical);
    expect(live.filter((i) => i.severity === "warning").length).toBe(c.warning);
    expect(live.filter((i) => i.severity === "info").length).toBe(c.info);
    expect(items.length - live.length).toBe(c.snoozed);
    expect(summarizeSpendAlarms(live)).toBe("Spend alarms: 1 critical, 2 need a decision, 1 for your information.");
  });

  it("the reader pages past the 1,000-row cap", async () => {
    const full = Array.from({ length: ROWS_PAGE }, (_, i) => ({ ...rec({ id: `p${i}` }) }));
    pages.push(full, [{ ...rec({ id: "last" }) }]);
    const all = await fetchSpendAlarmRows();
    expect(all).toHaveLength(ROWS_PAGE + 1);
    expect(calls).toEqual([
      [0, ROWS_PAGE - 1],
      [ROWS_PAGE, 2 * ROWS_PAGE - 1],
    ]);
  });
});

describe("sentences are words", () => {
  it("a protected-account refusal names the mandate and the person, never codes", () => {
    const text = alarmSentence(rec());
    assertPlain(text);
    expect(text).toContain("Mandate: Hindsight Replay Judge");
    expect(text).toContain("admin@admin.com");
  });

  it("a failed check has no terminal colours or ORM banner", () => {
    const text = alarmSentence(
      rec({
        kind: "guardrail.check_failed",
        refs: {},
        detail:
          "The retry-storm check could not run (QueryTimeoutError: \u001b[91m\n----\nMatrx ORM | QueryTimeoutError\nscheduler.automation_repeat_runs_24h). Limit: None; observed: None.",
      }),
    );
    assertPlain(text);
    expect(text).toMatch(/^The retry-storm check could not run: its database query timed out\./);
  });

  it("an old skip sentence drops its code and id", () => {
    const text = alarmSentence(
      rec({
        kind: "source_intelligence_skipped",
        refs: { user_id: U },
        detail: `note d35a208a-affe-4e20-b439-6e20353ff594 is owned by a protected/test account, so its automatic ingest was skipped (protected_account_test_data), not run.`,
      }),
    );
    assertPlain(text);
  });
});

describe("a Source opens its own page or says it is gone", () => {
  it("notes, tasks, messages and documents open; deleted ones read (deleted)", () => {
    const base = { source_kind: "note", times: 1, last_at: "2026-10-11T00:00:00Z" };
    expect(alarmSourceHref({ ...base, id: "n1", kind: "note", title: "Plan" })).toBe("/notes/n1");
    expect(alarmSourceHref({ ...base, id: "t1", kind: "task", title: "T" })).toBe("/tasks/t1");
    expect(alarmSourceHref({ ...base, id: "m1", kind: "message", title: "M", parent_id: "c1" })).toBe("/chat/c1");
    expect(alarmSourceHref({ ...base, id: "n2", kind: "note", title: "Old", deleted: true })).toBeNull();
    expect(alarmSourceTitle({ ...base, id: "n2", kind: "note", title: "Old", deleted: true })).toBe("Old (deleted)");
    expect(alarmSourceTitle({ ...base, id: "x", kind: "message", title: null, missing: true })).toMatch(/\(deleted\)$/);
  });
});

describe("avoided cost comes from the held run's estimate", () => {
  it("a refusal with a held-run estimate reads '$X avoided (est.)' and Copy for AI says it was measured", () => {
    const r = rec({ cost_avoided_usd: 0.172128 });
    expect(costLabel(r, (n) => `$${n.toFixed(2)}`)).toBe("$0.17 avoided (est.)");
    expect(alarmCostLine(null, 0.172128, (n) => `$${n.toFixed(2)}`)).toBe("$0.17 avoided (est.)");
    const occ = [{ id: "o", occurred_at: "2026-10-11T04:00:00Z", repeat_count: 1, run_id: null, execution_id: null, refs: {}, detail: null, cost_usd: null, cost_avoided_usd: 0.172128 }];
    const data = alarmAgentData(r, occ) as { alarm: { cost_avoided_usd: number; cost_avoided_measured: boolean }; occurrences: { cost_avoided_usd: number | null }[] };
    expect(data.alarm.cost_avoided_usd).toBeCloseTo(0.172128);
    expect(data.alarm.cost_avoided_measured).toBe(true);
    expect(data.occurrences[0].cost_avoided_usd).toBeCloseTo(0.172128);
  });

  it("without an estimate it stays $0 refused and not measured", () => {
    const r = rec({ cost_avoided_usd: null });
    expect(costLabel(r, (n) => `$${n.toFixed(2)}`)).toBe("$0.00 · refused");
    const data = alarmAgentData(r, []) as { alarm: { cost_avoided_measured: boolean } };
    expect(data.alarm.cost_avoided_measured).toBe(false);
  });
});
