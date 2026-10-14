import { alarmActions, alarmAgentData, alarmControls, isRinging, refLinks, spendAlarmHref, type SpendAlarmRecord } from "./spendAlarms";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

const U = "87a6e699-3622-4869-8843-d0867456c0dd";
const T = "33333333-3333-3333-3333-333333333333";

const rec = (over: Partial<SpendAlarmRecord> = {}): SpendAlarmRecord => ({
  id: "rec-1",
  kind: "protected_account_refusal",
  level: "critical",
  title: "Automated run tried to bill a protected account",
  detail: "Refused.",
  rule: "Automations never bill a protected account",
  fix: "Stop it",
  subject_type: "protected_account",
  subject_id: `${U}:scheduled:auto_ingest`,
  subject_name: null,
  refs: { user_id: U, handler: "auto_ingest", task_id: T },
  occurrence_count: 1318,
  first_seen_at: "2026-10-10T00:00:00Z",
  last_seen_at: "2026-10-10T10:00:00Z",
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
  person: "admin@admin.com",
  code_fix: { on: "2026-10-10", commit: "aidream 8ab384301f", what: "Skipped once", related_kind: "source_intelligence_skipped", handler: "auto_ingest" },
  ...over,
});

describe("spend alarm record doors", () => {
  it("the protected refusal opens the task, its runs, the served item and the account", () => {
    const links = refLinks({ ...rec().refs, run_id: "run-7", source_kind: "note", source_id: "n-5" });
    const by = Object.fromEntries(links.map((l) => [l.key, l.href]));
    expect(by.task_id).toBe(`/administration/automation/scheduling/tasks/${T}`);
    expect(by.run_id).toBe(`/administration/automation/scheduling/tasks/${T}`);
    expect(by.source_id).toBe("/notes/n-5");
    expect(by.user_id).toBe(`/administration/users/usage?user=${U}`);
    expect(links[0]!.key).toBe("task_id");
  });

  it("actions follow the blocked thing's live state", () => {
    expect(alarmActions(rec(), { task: { enabled: true } })).toEqual(["run_now", "pause"]);
    expect(alarmActions(rec(), { task: { enabled: false } })).toEqual(["run_now", "resume"]);
    expect(alarmActions(rec(), { task: null })).toEqual([]);
    expect(alarmActions(rec({ refs: { approval_id: "ap-1", agent_id: "ag-1" } }), { approvalStatus: "waiting" })).toEqual([
      "approve",
      "reject",
      "open_agent",
    ]);
    expect(alarmActions(rec({ refs: { approval_id: "ap-1" } }), { approvalStatus: "approved" })).toEqual(["reject"]);
    expect(alarmActions(rec({ refs: { mandate_key: "seo.topic_assigner" } }))).toEqual(["open_mandate"]);
  });

  it("snoozed rings again when its time passes; resolved never rings", () => {
    const now = Date.parse("2026-10-11T00:00:00Z");
    expect(isRinging({ status: "snoozed", snoozed_until: "2026-10-10T23:00:00Z" }, now)).toBe(true);
    expect(isRinging({ status: "snoozed", snoozed_until: "2026-10-11T23:00:00Z" }, now)).toBe(false);
    expect(isRinging({ status: "resolved", snoozed_until: null }, now)).toBe(false);
  });

  it("the AI payload carries ids, links, the rule and every occurrence", () => {
    const data = alarmAgentData(rec(), [
      { id: "o1", occurred_at: "2026-10-10T10:00:00Z", repeat_count: 4, run_id: "run-7", execution_id: null, refs: { task_id: T, run_id: "run-7" }, detail: null, cost_usd: null },
    ], "https://manage.aimatrx.com");
    const text = JSON.stringify(data);
    expect(data.alarm.page).toBe(`https://manage.aimatrx.com${spendAlarmHref("rec-1")}`);
    expect(data.alarm.rule).toContain("protected");
    expect(text).toContain(`/administration/automation/scheduling/tasks/${T}`);
    expect(data.occurrences[0]!.run_id).toBe("run-7");
  });
});

import { alarmHeadline, hasRawId } from "./spendAlarms";

describe("headlines carry no raw ids", () => {
  it("swaps the subject id for its name and drops any other id", () => {
    const id = "6b6b4e45-4699-4860-8dea-d8a60e07d69a";
    expect(alarmHeadline(`Run held for spend approval: agent ${id}`, id, "Keyword classifier")).toBe(
      "Run held for spend approval: agent Keyword classifier",
    );
    const bare = alarmHeadline(`Run held for spend approval: agent ${id}`, id, null);
    expect(hasRawId(bare)).toBe(false);
    expect(alarmHeadline("Spend spike: Platform spend, last hour")).toBe("Spend spike: Platform spend, last hour");
  });
});

import { formatSpendUsd } from "@/components/cost/formatAdminCost";
import { alarmCostLine, costLabel, fixFor, isMigrated, refHref } from "./spendAlarms";

describe("what the record page leads with", () => {
  const fmt = (n: number) => formatSpendUsd(n);
  it("cost is never a bare dash", () => {
    expect(costLabel(rec(), fmt)).toBe("$0.00 · refused");
    expect(costLabel(rec({ cost_usd: 10.67 }), fmt)).toBe("$10.67 spent");
    expect(costLabel(rec({ refused: false }), fmt)).toBe("Not measured");
  });
  it("a rolling-window snapshot shows its latest reading and window, never spent", () => {
    const snap = { cost_usd: 66.21, cost_mode: "snapshot" as const, cost_label: "last 7 days at list price ($0.00 billed)" };
    expect(costLabel(rec(snap), fmt)).toBe("$66.21 last 7 days at list price ($0.00 billed)");
    expect(alarmCostLine(66.21, null, fmt, snap)).toBe("$66.21 last 7 days at list price ($0.00 billed)");
    expect(alarmCostLine(66.21, null, fmt, { cost_mode: "incremental" })).toBe("$66.21 spent");
  });
  it("a handler-scoped fix covers only that handler", () => {
    expect(fixFor(rec({ refs: { handler: "auto_ingest" } }))?.commit).toBe("aidream 8ab384301f");
    expect(fixFor(rec({ refs: { handler: "agent-app" } }))).toBeNull();
  });
  it("migrated occurrences are told apart, and documents open", () => {
    expect(isMigrated({ refs: { migrated: "x" } as never })).toBe(true);
    expect(refHref("source_id", "d-1", { source_kind: "document" })).toBe("/documents/d-1");
  });
});

import { readable, whose } from "./spendAlarms";

describe("no ids, no type slugs", () => {
  it("whose names the person, record or service", () => {
    expect(whose(rec({ subject_type: "external_api", subject_name: null, refs: { provider: "scrapecreators", operation: "lookup" } }))).toBe("ScrapeCreators lookup");
    expect(whose(rec({ subject_type: "llm_provider", subject_name: null, refs: { provider: "anthropic" } }))).toBe("Anthropic");
    expect(whose(rec({ subject_type: "source", subject_name: null, refs: {} }))).toBe("Source (not found)");
    expect(whose(rec({ kind: "sms_sent_ungated", subject_type: "sms_message", subject_name: null, refs: {}, person: null }))).toBe("SMS with no origin stamp");
  });
  it("prose is a sentence with names, never ids", () => {
    const id = "4117adee-0809-4b46-99b2-8339915d3d2d";
    expect(readable(`document ${id} is owned by a protected account`, new Map([[id, "Untitled Space"]]))).toBe(
      "Document Untitled Space is owned by a protected account",
    );
    expect(readable(`run of agent ${id} refused`, new Map())).toBe("Run of agent refused");
  });
});

describe("every threshold alarm links the setting that rings it", () => {
  it("the GitHub Actions spend alarm opens its caps on the Limits & Knobs page", () => {
    const r = rec({ kind: "ci_spend_off_track", refs: { scope: "github_actions", window: "7d" } });
    expect(alarmControls(r)).toEqual([
      { label: "GitHub Actions caps", href: "/administration/users/limits?knob=billing.ci_spend" },
    ]);
    expect(alarmAgentData(r).alarm.change_the_limit).toEqual([
      { setting: "GitHub Actions caps", link: "/administration/users/limits?knob=billing.ci_spend" },
    ]);
  });

  it("a knob the alarm names itself opens, and a new guardrail kind still finds the guardrails", () => {
    const priced = rec({ kind: "external_call_unpriced", refs: { knob: "platform.external_api_prices.brave_search_usd" } });
    expect(alarmControls(priced).map((c) => c.href)).toEqual([
      "/administration/users/limits?knob=platform.external_api_prices.brave_search_usd",
    ]);
    expect(refLinks(priced.refs).find((l) => l.key === "knob")?.href).toBe(
      "/administration/users/limits?knob=platform.external_api_prices.brave_search_usd",
    );
    expect(alarmControls(rec({ kind: "guardrail.something_new", refs: {} }))[0]?.href).toBe(
      "/administration/users/limits?knob=automation.guardrails",
    );
  });

  it("an alarm that rings on a rule, not a number, shows no control", () => {
    expect(alarmControls(rec())).toEqual([]);
  });
});
