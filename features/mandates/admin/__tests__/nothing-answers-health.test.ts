/**
 * A JOB NO RUNG ANSWERS IS A RED DEFECT (2026-10-17, Agent Studio outage).
 *
 * `agent_studio.do_the_job_together` had no default Holder and no binding, so
 * every Studio visit logged "no rung answers this job — nothing names a
 * Holder"; the admin list row read the calm "no Mandate Holder yet" and the
 * record page's Health tab showed nothing. These cases go RED against that
 * derivation: no state named "nothing answers" existed, and a disabled binding
 * counted as filling the job.
 */
import { buildRow, HEALTH_CLASS, HEALTH_PRIORITY, jobAnswersSomewhere } from "../mandate-health";
import { mandateStatusOfRow } from "@/features/mandates/status/mandate-status";
import type { MandateConsoleData, MandateDefinitionRow } from "../service";

const MANDATE_ID = "11111111-1111-1111-1111-111111111111";
const AGENT_ID = "22222222-2222-2222-2222-222222222222";

function data(bindings: Record<string, unknown>[] = []): MandateConsoleData {
  return {
    mandates: [],
    agentsById: {
      [AGENT_ID]: { id: AGENT_ID, name: "Studio", agentType: "builtin", version: 1 },
    },
    versionsById: {},
    bindingsByMandateId: bindings.length ? { [MANDATE_ID]: bindings } : {},
  } as unknown as MandateConsoleData;
}

function mandate(overrides: Record<string, unknown> = {}): MandateDefinitionRow {
  return {
    id: MANDATE_ID,
    mandate_key: "agent_studio.do_the_job_together",
    label: null,
    is_enabled: true,
    output_kind: null,
    metadata: null,
    default_holder_id: null,
    default_holder_version_id: null,
    fallback_mandate_key: null,
    updated_at: "2026-10-17T20:00:00Z",
    ...overrides,
  } as unknown as MandateDefinitionRow;
}

const binding = (extra: Record<string, unknown>) => ({
  id: "33333333-3333-3333-3333-333333333333",
  mandate_id: MANDATE_ID,
  principal_type: "org",
  holder_type: "agent",
  holder_id: AGENT_ID,
  deleted_at: null,
  is_enabled: true,
  ...extra,
});

describe("nothing answers", () => {
  it("no default Holder, no fallback, no binding → 'nothing answers', ranked worst and red", () => {
    const row = buildRow(mandate(), data());
    expect(row.health).toBe("nothing answers");
    expect(HEALTH_PRIORITY["nothing answers"]).toBeLessThan(HEALTH_PRIORITY["unresolved pin"]);
    expect(HEALTH_CLASS["nothing answers"]).toContain("destructive");
  });

  it("a DISABLED binding answers nobody → still 'nothing answers', status draft", () => {
    const off = binding({ is_enabled: false });
    expect(buildRow(mandate(), data([off])).health).toBe("nothing answers");
    expect(jobAnswersSomewhere(mandate(), [off])).toBe(false);
    expect(mandateStatusOfRow(mandate(), [off])).toBe("draft");
  });

  it("an enabled binding or a fallback job answers → calm 'no Mandate Holder yet'", () => {
    expect(buildRow(mandate(), data([binding({})])).health).toBe("no Mandate Holder yet");
    expect(
      buildRow(mandate({ fallback_mandate_key: "agent_studio.chat_brief" }), data()).health,
    ).toBe("no Mandate Holder yet");
    expect(mandateStatusOfRow(mandate(), [binding({})])).toBe("active");
  });

  it("a default Holder answers → never 'nothing answers'", () => {
    const row = buildRow(mandate({ default_holder_id: AGENT_ID }), data());
    expect(row.health).not.toBe("nothing answers");
  });

  it("a disabled job is refused on purpose → its status says so, not this health", () => {
    expect(buildRow(mandate({ is_enabled: false }), data()).health).not.toBe("nothing answers");
  });
});
