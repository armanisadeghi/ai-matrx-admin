/**
 * Spend alarms on the attention dock — the record (`billing.spend_alarm`, read through
 * `billing.spend_alarms_for_attention`) becomes a decision row: severity, the record door, a
 * count/last-seen state, one sentence with names (never a uuid), the blocked records as
 * "Where it shows", the latest occurrence as evidence, the fix beside the complaint, and a mute
 * that is a FACT ABOUT THE RECORD (`spend_alarm_set_status`: snoozed until + note + by).
 */

import { delegatedSpendAlarms, spendAlarmItems, summarizeSpendAlarms, SPEND_ALARM_SOURCE_ID, type SpendAlarmDeps } from "../sources/spend-alarms";
import { buildAttentionNotice } from "../build-notice";
import type { AttentionSourceState } from "../types";
import { adminScheduleHref } from "@/features/scheduling/constants/routes";
import type { SpendAlarmAttentionRow } from "@/features/admin/spend-alarms/spendAlarms";

const NOW = Date.parse("2026-10-10T23:00:00Z");
const TASK = "7f3e2a10-1111-4b2c-8d00-00000000aa01";
const APPROVAL = "9a0b1c2d-2222-4e3f-9a00-00000000bb02";
const ALARM = "c0ffee00-3333-4a4a-8b8b-00000000cc03";

function row(over: Partial<SpendAlarmAttentionRow> = {}): SpendAlarmAttentionRow {
  return {
    id: ALARM,
    kind: "spend_approval_hold",
    level: "warning",
    title: `Run held for approval: ${TASK}`,
    detail: `The automation ${TASK} wanted to spend and was held until a person decides.`,
    rule: "Automated spend needs an approval",
    fix: "Approve or reject the held automation",
    subject_type: "sch_task",
    subject_id: TASK,
    subject_name: "Nightly SEO crawl",
    refs: { task_id: TASK, approval_id: APPROVAL },
    occurrence_count: 1388,
    first_seen_at: "2026-10-09T10:00:00Z",
    last_seen_at: "2026-10-10T22:51:00Z",
    cost_usd: null,
    cost_avoided_usd: 3.2,
    status: "open",
    snoozed_until: null,
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
    reopened_count: 0,
    refused: true,
    code_fix: null,
    person: null,
    snooze_note: null,
    snoozed_by: null,
    latest_occurrence_at: "2026-10-10T22:51:00Z",
    latest_occurrence_detail: `Held again for ${TASK}`,
    task_enabled: true,
    task_title: "Nightly SEO crawl",
    approval_status: "waiting",
    ...over,
  };
}

function deps(over: Partial<SpendAlarmDeps> = {}): SpendAlarmDeps & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    setStatus: async (...args) => {
      calls.push(["setStatus", ...args]);
    },
    decideApproval: async (...args) => {
      calls.push(["decideApproval", ...args]);
    },
    setTaskEnabled: async (...args) => {
      calls.push(["setTaskEnabled", ...args]);
    },
    runTaskNow: async (...args) => {
      calls.push(["runTaskNow", ...args]);
    },
    now: NOW,
    ...over,
  };
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("spendAlarmItems", () => {
  it("maps a record to a decision row: severity, record door, count state, names not ids", () => {
    const [item] = spendAlarmItems([row()], deps());
    expect(item.key).toBe(`${SPEND_ALARM_SOURCE_ID}:${ALARM}`);
    expect(item.severity).toBe("warning");
    expect(item.record).toEqual({ token: "spend_alarm", id: ALARM, href: `/administration/billing/alarms/${ALARM}` });
    expect(item.state).toMatch(/^1,388 times · last /);
    expect(item.title).toBe("Run held for approval: Nightly SEO crawl");
    expect(item.sentence).toContain("Nightly SEO crawl");
    expect(item.sentence).not.toMatch(UUID);
    expect(item.title).not.toMatch(UUID);
    expect(item.fix).toBe("Approve or reject the held automation");
  });

  it("info is its own severity; critical stays critical", () => {
    const items = spendAlarmItems([row({ id: "a", level: "info" }), row({ id: "b", level: "critical" })], deps());
    expect(items.map((i) => i.severity)).toEqual(["info", "critical"]);
  });

  it("the blocked records are 'Where it shows' doors, the latest occurrence is the evidence", () => {
    const [item] = spendAlarmItems([row()], deps());
    const impact = item.doors.filter((d) => d.kind === "impact");
    expect(impact.map((d) => d.href)).toEqual([
      adminScheduleHref(TASK),
      `/administration/billing/approvals?id=${APPROVAL}`,
    ]);
    expect(impact[0].label).toBe("Nightly SEO crawl");
    const evidence = item.doors.filter((d) => d.kind === "evidence");
    expect(evidence).toHaveLength(1);
    expect(evidence[0].href).toBe(`/administration/billing/alarms/${ALARM}#occurrences`);
    expect(evidence[0].what ?? "").not.toMatch(UUID);
    expect(item.impactDeclared).toBe(true);
  });

  it("the fix beside the complaint: Approve / Reject for a waiting hold, Pause for a running task, Resolve — consequences first", async () => {
    const d = deps();
    const [item] = spendAlarmItems([row()], d);
    const ids = item.actions.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["approve", "reject", "pause", "run_now", "resolve"]));
    expect(ids).not.toContain("resume");
    for (const action of item.actions) {
      expect(action.confirm?.description.length ?? 0).toBeGreaterThan(10);
    }
    await item.actions.find((a) => a.id === "approve")!.run();
    await item.actions.find((a) => a.id === "pause")!.run();
    await item.actions.find((a) => a.id === "resolve")!.run();
    expect(d.calls).toEqual([
      ["decideApproval", APPROVAL, "approve"],
      ["setTaskEnabled", TASK, false],
      ["setStatus", ALARM, "resolved", {}],
    ]);
  });

  it("a paused task offers Resume, a decided approval no longer offers its own verb", () => {
    const [item] = spendAlarmItems([row({ task_enabled: false, approval_status: "approved" })], deps());
    const ids = item.actions.map((a) => a.id);
    expect(ids).toContain("resume");
    expect(ids).not.toContain("pause");
    expect(ids).not.toContain("approve");
    expect(ids).toContain("reject");
  });

  it("MUTE IS A FACT ABOUT THE RECORD: until + note go to spend_alarm_set_status; unmute reopens", async () => {
    const d = deps();
    const [item] = spendAlarmItems([row()], d);
    expect(item.mute?.scope).toBe("server");
    expect(item.mute?.current).toBeNull();
    const until = NOW + 60 * 60 * 1000;
    await item.mute!.apply(until, "Known: approvals backlog");
    await item.mute!.clear!();
    expect(d.calls).toEqual([
      ["setStatus", ALARM, "snoozed", { snoozedUntil: new Date(until).toISOString(), note: "Known: approvals backlog" }],
      ["setStatus", ALARM, "open", {}],
    ]);
  });

  it("a snoozed record carries its mute (until, note, by); a snooze that has run out is not a mute", () => {
    const until = new Date(NOW + 3_600_000).toISOString();
    const [live] = spendAlarmItems(
      [row({ status: "snoozed", snoozed_until: until, snooze_note: "backlog", snoozed_by: "admin@admin.com" })],
      deps(),
    );
    expect(live.mute?.current).toEqual({ until, reason: "backlog", by: "admin@admin.com" });
    const [expired] = spendAlarmItems(
      [row({ status: "snoozed", snoozed_until: new Date(NOW - 1).toISOString(), snooze_note: "old" })],
      deps(),
    );
    expect(expired.mute?.current).toBeNull();
  });

  it("every row can be copied for AI with the record's own words, doors, occurrences and cost", async () => {
    const occ = [{ id: "o1", occurred_at: "2026-10-10T22:51:00Z", repeat_count: 3, run_id: null, execution_id: null, refs: {}, detail: null, cost_usd: null }];
    const [item] = spendAlarmItems([row()], deps({ fetchOccurrences: async () => occ }));
    expect(item.copy).toBeDefined();
    const payload = await item.copy!.agent();
    expect(payload.kind).toBe("spend-alarm");
    const data = payload.data as { occurrences: unknown[]; alarm: { cost: string } };
    expect(data.occurrences).toHaveLength(1);
    expect(data.alarm.cost).toBe("$3.20 avoided (est.)");
    expect(payload.location).toBe(`/administration/billing/alarms/${ALARM}`);
    expect(item.copy!.human()).toContain("Nightly SEO crawl");
  });
});

describe("summarizeSpendAlarms", () => {
  it("counts by level for the dock title; null at zero", () => {
    expect(summarizeSpendAlarms([])).toBeNull();
    const items = spendAlarmItems(
      [row({ id: "1", level: "critical" }), row({ id: "2", level: "critical" }), row({ id: "3" }), row({ id: "4", level: "info" })],
      deps(),
    );
    expect(summarizeSpendAlarms(items)).toBe("Spend alarms: 2 critical, 1 needs a decision, 1 for your information.");
  });
});


describe("who an alarm is for (Arman 2026-10-11: the owner's card shows only what needs him)", () => {
  const owner = row({ id: "a-owner", audience: "owner_decision" });
  const agent = row({ id: "a-agent", kind: "sms_sent_ungated", level: "critical", audience: "agent_fix", work_item_id: "w-1" });
  const info = row({ id: "a-info", kind: "protected_account_refusal", level: "critical", audience: "info_only" });
  const escalated = row({ id: "a-esc", audience: "owner_decision", audience_note: "Agents could not fix this: needs a price decision" });

  it("lists only owner decisions as rows; agent_fix and info_only never reach the card", () => {
    const items = spendAlarmItems([owner, agent, info, escalated], deps());
    expect(items.map((i) => i.id)).toEqual(["a-owner", "a-esc"]);
    expect(items.every((i) => i.audience === "owner_decision")).toBe(true);
  });

  it("the GitHub billing block card carries the Fix GitHub billing action and a plain label", () => {
    const block = row({ id: "a-bill", kind: "ci_billing_block", level: "critical", audience: "owner_decision" });
    const [item] = spendAlarmItems([block], deps());
    const act = item.actions.find((x) => x.id === "fix_github_billing");
    expect(act?.label).toBe("Fix GitHub billing");
    expect(act?.confirm?.description).toContain("No deploys or package releases run until billing is fixed");
  });

  describe("the CI spend card's Pause button is real or absent", () => {
    const ci = row({ id: "a-ci", kind: "ci_spend_off_track", audience: "owner_decision" });
    const costly = {
      "a-ci": [
        { repo: "AI-Matrix-Engine/aidream", workflow: "CI", usd_per_day: 31.456, pausable: true, reason: null },
        { repo: "AI-Matrix-Engine/aidream", workflow: "Deploy", usd_per_day: 20, pausable: false, reason: "release path" },
      ],
    };
    const ciDeps = () => {
      const d = deps({ ciCostly: costly });
      d.pauseCiWorkflows = async (id) => void d.calls.push(["pauseCi", id]);
      d.resumeCiWorkflows = async (id) => void d.calls.push(["resumeCi", id]);
      return d;
    };

    it("is absent when the server has not named what it may pause (no dishonest control)", () => {
      const [item] = spendAlarmItems([ci], deps());
      expect(item.actions.find((x) => x.id === "pause_ci_workflows")).toBeUndefined();
    });

    it("confirm names the workflows and the dollars a day, leaves out the release path, and calls the server", async () => {
      const d = ciDeps();
      const [item] = spendAlarmItems([ci], d);
      const act = item.actions.find((x) => x.id === "pause_ci_workflows");
      expect(act?.label).toBe("Pause the costly workflows");
      expect(act?.confirm?.description).toContain("aidream CI (\$31.46/day)");
      expect(act?.confirm?.description).not.toContain("Deploy (");
      await act?.run();
      expect(d.calls).toEqual([["pauseCi", "a-ci"]]);
    });

    it("after a pause the card says what is paused and offers Resume instead", async () => {
      const d = ciDeps();
      const paused = row({ ...ci, ci_pause: { paused: [{ repo: "AI-Matrix-Engine/aidream", workflow: "CI", file: "ci.yml", usd_per_day: 31.46, paused_at: "2026-10-11T10:00:00Z" }] } });
      const [item] = spendAlarmItems([paused], d);
      expect(item.fix).toContain("Paused on GitHub: aidream CI (\$31.46/day)");
      expect(item.actions.find((x) => x.id === "pause_ci_workflows")).toBeUndefined();
      await item.actions.find((x) => x.id === "resume_ci_workflows")?.run();
      expect(d.calls).toEqual([["resumeCi", "a-ci"]]);
    });
  });

  it("says what the agent tried when an alarm came back to the owner", () => {
    const [item] = spendAlarmItems([escalated], deps());
    expect(item.about).toContain("Agents could not fix this: needs a price decision");
  });

  it("counts agent_fix as one line linking to the agents' list, muted ones excluded", () => {
    const muted = row({ id: "a-muted", audience: "agent_fix", status: "snoozed", snoozed_until: "2026-10-11T23:00:00Z" });
    expect(delegatedSpendAlarms([owner, agent, info, muted], NOW)).toEqual({ count: 1, href: "/administration/billing/alarms?audience=agent_fix" });
    expect(delegatedSpendAlarms([owner, info], NOW)).toBeNull();
  });

  it("the agents line rides the section but never the pill; zero owner decisions = no card", () => {
    const source = (items: ReturnType<typeof spendAlarmItems>): AttentionSourceState => ({
      id: SPEND_ALARM_SOURCE_ID, label: "Spend alarms", items, status: "ok", error: null, loud: true,
      summarize: summarizeSpendAlarms, review: null, refetch: () => {}, delegated: { count: 4, href: "/x" },
    });
    const withOwner = buildAttentionNotice([source(spendAlarmItems([owner, agent, info], deps()))], {}, NOW);
    expect(withOwner?.pill).toBe("1 thing needs a person");
    expect(withOwner?.sections[0].source.delegated?.count).toBe(4);
    expect(buildAttentionNotice([source(spendAlarmItems([agent, info], deps()))], {}, NOW)).toBeNull();
  });
});
