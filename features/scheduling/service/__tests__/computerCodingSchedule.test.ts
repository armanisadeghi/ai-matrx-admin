/**
 * A coding schedule on a computer. Saves go through the ONE device-task door, aidream
 * POST /scheduling/device-tasks (create) and PATCH /scheduling/device-tasks/{id} (edit); the web
 * sends the form's shape and inserts no sch_task / sch_trigger row itself. The row the server then
 * writes is read back by rowToAgendaTask and taskDetailToAgendaTask: its work — folder, app,
 * account, prompt — is never an empty prompt and "Platform default" (the 2026-10-15 walk: 9968d08a…).
 * The server half (body -> rows -> detail) is aidream api/tests/test_device_tasks_route.py.
 */
jest.mock("../schedulerClient", () => ({
  createDeviceTask: jest.fn(),
  updateDeviceTask: jest.fn(),
}));
jest.mock("@/utils/supabase/client", () => ({
  supabase: { from: jest.fn(() => { throw new Error("the web wrote a row itself"); }) },
}));
jest.mock("@/utils/supabase/schedulerDb", () => ({
  schedulerDb: jest.fn(() => { throw new Error("the web wrote a scheduler row itself"); }),
}));

import { rowToAgendaTask, createComputerCodingTask, updateComputerCodingTask } from "../queries";
import { createDeviceTask, updateDeviceTask } from "../schedulerClient";
import { supabase } from "@/utils/supabase/client";
import { schedulerDb } from "@/utils/supabase/schedulerDb";

const home = { token: "project" as const, id: "p-1", label: "Site" };
const once = { type: "one-shot" as const, at: "2030-01-15T17:00:00.000Z" };

describe("a coding schedule on a computer: save and edit go to the route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createDeviceTask as jest.Mock).mockResolvedValue({ id: "task-1", next_run_at: "2030-01-15T17:00:00Z" });
    (updateDeviceTask as jest.Mock).mockResolvedValue({ id: "task-1", next_run_at: "2030-01-16T17:00:00Z" });
  });

  it("create POSTs the work (folder, app, account, prompt, homes) and the time, and returns the server's id", async () => {
    const out = await createComputerCodingTask({ title: "Nightly tidy", description: null, deviceId: "dev-1", folder: "/w/site", prompt: "Tidy the README", provider: "codex", accountProfileId: "acct-1", homes: [home], trigger: once } as never);
    expect(out).toEqual({ id: "task-1" });
    expect(createDeviceTask).toHaveBeenCalledTimes(1);
    expect(createDeviceTask).toHaveBeenCalledWith({
      device_id: "dev-1", name: "Nightly tidy", description: null, tool: "coding_sessions_drive",
      tool_args: { provider: "codex", folder: "/w/site", prompt: "Tidy the README", account_profile_id: "acct-1" },
      homes: [home], trigger: once,
    });
    expect(updateDeviceTask).not.toHaveBeenCalled();
  });

  it("create with no account and no homes sends neither, so the server applies its defaults", async () => {
    await createComputerCodingTask({ title: "t", description: null, deviceId: "dev-1", folder: "/w", prompt: "p", provider: "claude", accountProfileId: null, homes: [], trigger: once } as never);
    const body = (createDeviceTask as jest.Mock).mock.calls[0][0];
    expect(body.tool_args).toEqual({ provider: "claude", folder: "/w", prompt: "p" });
    expect(body).not.toHaveProperty("homes");
  });

  it("edit PATCHes the same task id with the whole new shape (new app, no account, other home)", async () => {
    await updateComputerCodingTask(
      { id: "task-1", deviceOp: null, triggerId: "trg-1" },
      { title: "Nightly tidy", description: null, deviceId: "dev-1", folder: "/w/site", prompt: "Tidy the README and CHANGELOG", provider: "claude", accountProfileId: null, homes: [{ token: "war_room", id: "w-1", label: "Launch" }], trigger: { type: "one-shot", at: "2030-01-16T17:00:00.000Z" } as never },
    );
    expect(updateDeviceTask).toHaveBeenCalledTimes(1);
    expect(updateDeviceTask).toHaveBeenCalledWith("task-1", {
      device_id: "dev-1", name: "Nightly tidy", description: null, tool: "coding_sessions_drive",
      tool_args: { provider: "claude", folder: "/w/site", prompt: "Tidy the README and CHANGELOG" },
      homes: [{ token: "war_room", id: "w-1", label: "Launch" }],
      trigger: { type: "one-shot", at: "2030-01-16T17:00:00.000Z" },
    });
    expect(createDeviceTask).not.toHaveBeenCalled();
  });

  it("an edit that leaves homes undefined does not send them (the server keeps what it has)", async () => {
    await updateComputerCodingTask(
      { id: "task-1", deviceOp: null, triggerId: "trg-1" },
      { title: "t", description: null, deviceId: "dev-1", folder: "/w", prompt: "p", provider: "claude", accountProfileId: null, trigger: once } as never,
    );
    expect((updateDeviceTask as jest.Mock).mock.calls[0][1]).not.toHaveProperty("homes");
  });

  it("a server refusal reaches the caller, on create and on edit", async () => {
    (createDeviceTask as jest.Mock).mockRejectedValue(new Error("That computer is not in an organization"));
    await expect(createComputerCodingTask({ title: "t", description: null, deviceId: "d", folder: "/w", prompt: "p", provider: "claude", accountProfileId: null, trigger: once } as never)).rejects.toThrow("That computer is not in an organization");
    (updateDeviceTask as jest.Mock).mockRejectedValue(new Error("The schedule was not found."));
    await expect(updateComputerCodingTask({ id: "x", deviceOp: null, triggerId: null }, { title: "t", description: null, deviceId: "d", folder: "/w", prompt: "p", provider: "claude", accountProfileId: null, trigger: once } as never)).rejects.toThrow("The schedule was not found.");
  });

  it("the browser writes no scheduler row on create or edit", async () => {
    await createComputerCodingTask({ title: "t", description: null, deviceId: "d", folder: "/w", prompt: "p", provider: "claude", accountProfileId: null, trigger: once } as never);
    await updateComputerCodingTask({ id: "task-1", deviceOp: null, triggerId: "trg-1" }, { title: "t", description: null, deviceId: "d", folder: "/w", prompt: "p", provider: "claude", accountProfileId: null, trigger: once } as never);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(schedulerDb).not.toHaveBeenCalled();
  });
});

describe("a coding schedule row read back carries its work", () => {
  it("never an empty prompt or an agent default", () => {
    const task = rowToAgendaTask({
      id: "task-1", user_id: "u-1", organization_id: "org-1", queue: "default", tags: [], expires_at: null, next_due_at: null, last_run_at: null,
      created_at: "2026-10-15T00:00:00Z", updated_at: "2026-10-15T00:00:00Z", agent: null,
      kind: "device_op", title: "Nightly tidy", description: null, enabled: true, surfaces: ["desktop"], target_device_id: "dev-1",
      metadata: { device_op: { op: "coding.start", tool: "coding_sessions_drive", params: { provider: "codex", cwd: "/w/site", prompt: "Tidy the README", account_profile_id: "acct-1" }, homes: [home] } },
      triggers: [{ id: "trg-1", task_id: "task-1", type: "one-shot", config: { at: once.at }, enabled: true, next_due_at: null, last_fired_at: null }],
    } as never);
    expect(task.kind).toBe("device_op");
    expect(task.targetDeviceId).toBe("dev-1");
    expect(task.deviceOp).toMatchObject({ provider: "codex", folder: "/w/site", prompt: "Tidy the README", accountProfileId: "acct-1", homes: [home] });
    expect((task.deviceOp?.raw as { tool?: string }).tool).toBe("coding_sessions_drive");
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
