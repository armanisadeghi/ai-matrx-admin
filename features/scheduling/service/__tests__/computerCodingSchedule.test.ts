/**
 * A coding schedule on a computer, end to end through the real save and read functions: the form's
 * create writes kind device_op with its work in metadata.device_op; the row read back (the detail
 * and the edit form both read rowToAgendaTask) carries that work — folder, app, account, prompt —
 * never an empty prompt and "Platform default" (the 2026-10-15 walk: 9968d08a…); an edit keeps what
 * it does not touch and drops nothing. The database is a recorder at the supabase seam.
 */
import { rowToAgendaTask, createComputerCodingTask, updateComputerCodingTask } from "../queries";

const writes: Array<{ table: string; op: string; values: Record<string, unknown> }> = [];
let stored: Record<string, unknown> = {};

function table(name: string) {
  const chain: Record<string, unknown> = {};
  const done = (data: unknown) => Promise.resolve({ data, error: null });
  chain.insert = (values: Record<string, unknown>) => {
    writes.push({ table: name, op: "insert", values });
    if (name === "sch_task") stored = { ...values, id: "task-1" };
    return { select: () => ({ single: () => done({ id: "task-1" }) }), then: (r: (v: unknown) => void) => r({ data: null, error: null }) };
  };
  chain.update = (values: Record<string, unknown>) => {
    writes.push({ table: name, op: "update", values });
    if (name === "sch_task") stored = { ...stored, ...values };
    return { eq: () => done(null) };
  };
  chain.select = () => ({ eq: () => ({ maybeSingle: () => done(name === "app_instances" ? { organization_id: "org-1" } : { metadata: stored.metadata }) }) });
  return chain;
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
    from: (name: string) => table(name),
  },
}));
jest.mock("@/utils/supabase/schedulerDb", () => ({ schedulerDb: () => ({ from: (name: string) => table(name) }) }));

function readBack() {
  return rowToAgendaTask({
    ...(stored as object),
    user_id: "u-1",
    organization_id: "org-1",
    queue: "default",
    tags: [],
    expires_at: null,
    next_due_at: null,
    last_run_at: null,
    created_at: "2026-10-15T00:00:00Z",
    updated_at: "2026-10-15T00:00:00Z",
    agent: null,
    triggers: [{ id: "trg-1", task_id: "task-1", type: "one-shot", config: { at: "2030-01-15T17:00:00.000Z" }, enabled: true, next_due_at: null, last_fired_at: null }],
  } as never);
}

describe("a coding schedule on a computer: save, read, edit", () => {
  it("round-trips its work, never an empty prompt or an agent default", async () => {
    await createComputerCodingTask({ title: "Nightly tidy", description: null, deviceId: "dev-1", folder: "/w/site", prompt: "Tidy the README", provider: "codex", accountProfileId: "acct-1", trigger: { type: "one-shot", at: "2030-01-15T17:00:00.000Z" } } as never);
    const task = readBack();
    expect(task.kind).toBe("device_op");
    expect(task.targetDeviceId).toBe("dev-1");
    expect(task.deviceOp).toMatchObject({ provider: "codex", folder: "/w/site", prompt: "Tidy the README", accountProfileId: "acct-1" });

    await updateComputerCodingTask(
      { id: task.id, deviceOp: task.deviceOp ?? null, triggerId: "trg-1" },
      { title: "Nightly tidy", description: null, deviceId: "dev-1", folder: "/w/site", prompt: "Tidy the README and CHANGELOG", provider: "claude", accountProfileId: null, trigger: { type: "one-shot", at: "2030-01-16T17:00:00.000Z" } as never },
    );
    const edited = readBack();
    expect(edited.deviceOp).toMatchObject({ provider: "claude", prompt: "Tidy the README and CHANGELOG", accountProfileId: null });
    expect((edited.deviceOp?.raw as { tool?: string }).tool).toBe("coding_sessions_drive");
    expect(writes.some((w) => w.table === "sch_agent_task")).toBe(false);
  });
});

describe("a freshly created task read from the HTTP answer", () => {
  it("keeps its own kind and its computer work", async () => {
    const { taskDetailToAgendaTask } = await import("../queries");
    const task = taskDetailToAgendaTask({
      task: { id: "t", user_id: "u", kind: "device_op", title: "x", description: null, queue: "default", surfaces: ["desktop"], enabled: true, expires_at: null, tags: [], next_due_at: null, last_run_at: null, created_at: "", updated_at: "", target_device_id: "dev-1", metadata: { device_op: { op: "coding.start", params: { provider: "claude", cwd: "/w", prompt: "Go" } } } },
      agent_task: null,
      triggers: [],
    } as never);
    expect(task.kind).toBe("device_op");
    expect(task.targetDeviceId).toBe("dev-1");
    expect(task.deviceOp).toMatchObject({ folder: "/w", prompt: "Go" });
  });
});
