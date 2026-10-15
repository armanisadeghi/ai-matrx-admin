/**
 * Computer work is written by ONE door: aidream /scheduling/device-tasks (the writer the agent's
 * desktop_schedule tool uses). The web sends the form's own shapes there and inserts no sch_task
 * rows itself. The server half of the round trip (body -> rows -> detail) is aidream
 * api/tests/test_device_tasks_route.py::test_round_trip_form_route_row_detail, fed these bodies.
 */
jest.mock("./schedulerClient", () => ({
  createDeviceTask: jest.fn(async () => ({ id: "t1", next_run_at: "2026-10-15T02:00:00Z" })),
  updateDeviceTask: jest.fn(async () => ({ id: "t1", next_run_at: "2026-10-15T02:00:00Z" })),
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: { from: jest.fn(() => { throw new Error("the web wrote a row itself"); }) } }));
jest.mock("@/utils/supabase/schedulerDb", () => ({ schedulerDb: jest.fn(() => { throw new Error("the web wrote a scheduler row itself"); }) }));

import { createComputerAgentTask, createComputerCodingTask, updateComputerCodingTask } from "./queries";
import { createDeviceTask, updateDeviceTask } from "./schedulerClient";

const home = { token: "project" as const, id: "p1", label: "Site" };
const cron = { type: "cron" as const, expression: "0 2 * * *", tz: "UTC" };

describe("computer work goes through the one device-task door", () => {
  it("a coding schedule", async () => {
    await createComputerCodingTask({ title: "Nightly tidy", description: "d", deviceId: "dev-1", folder: "/w", prompt: "tidy", provider: "codex", accountProfileId: "acct", homes: [home], trigger: cron } as never);
    expect(createDeviceTask).toHaveBeenCalledWith({
      device_id: "dev-1", name: "Nightly tidy", description: "d", tool: "coding_sessions_drive",
      tool_args: { provider: "codex", folder: "/w", prompt: "tidy", account_profile_id: "acct" }, homes: [home], trigger: cron,
    });
  });

  it("an agent on this computer", async () => {
    await createComputerAgentTask({ title: "Inbox agent", description: null, deviceId: "dev-1", agentId: "a1", prompt: "sort", variables: {}, authMode: "ask", maxRuntimeSeconds: 900, maxConcurrent: 1, trigger: { type: "one-shot", at: "2026-12-01T09:00:00Z" } } as never);
    expect(createDeviceTask).toHaveBeenLastCalledWith(expect.objectContaining({ device_id: "dev-1", agent: { agent_id: "a1", prompt: "sort", variables: {}, auth_mode: "ask", max_runtime_seconds: 900, max_concurrent: 1 } }));
  });

  it("an edit (homes [] removes them, no account drops it)", async () => {
    await updateComputerCodingTask({ id: "t1", deviceOp: null, triggerId: "g1" }, { title: "Nightly tidy 2", description: null, deviceId: "dev-1", provider: "claude", folder: "/w2", prompt: "tidy more", accountProfileId: null, homes: [], trigger: { type: "interval", every_seconds: 3600 } } as never);
    expect(updateDeviceTask).toHaveBeenCalledWith("t1", {
      device_id: "dev-1", name: "Nightly tidy 2", description: null, tool: "coding_sessions_drive",
      tool_args: { provider: "claude", folder: "/w2", prompt: "tidy more" }, homes: [], trigger: { type: "interval", every_seconds: 3600 },
    });
  });
});
