/**
 * Runs on › Run an agent on this computer. The save goes through the ONE device-task door, aidream
 * POST /scheduling/device-tasks (see computerTasks.test.ts); the web sends the form's agent shape
 * and writes no scheduler row itself. The server owns the rows, the organization and the undo of a
 * partial save; here we prove what is sent, what comes back, and that a refusal reaches the person.
 */
jest.mock("./schedulerClient", () => ({
  createDeviceTask: jest.fn(),
  updateDeviceTask: jest.fn(),
}));
const noWrite = (what: string) => () => {
  throw new Error(`the web wrote a scheduler row itself (${what})`);
};
jest.mock("@/utils/supabase/client", () => ({ supabase: { from: jest.fn(() => noWrite("supabase.from")()) } }));
jest.mock("@/utils/supabase/schedulerDb", () => ({ schedulerDb: jest.fn(() => noWrite("schedulerDb")()) }));

import { createComputerAgentTask } from "./queries";
import { createDeviceTask, updateDeviceTask } from "./schedulerClient";
import { supabase } from "@/utils/supabase/client";
import { schedulerDb } from "@/utils/supabase/schedulerDb";
import { computerAgentErrors } from "../components/form/computerAgentErrors";

const input = {
  title: "Morning brief",
  description: null,
  deviceId: "device-1",
  agentId: "agent-1",
  prompt: "Summarise my desktop",
  variables: { a: 1 },
  authMode: "ask",
  maxRuntimeSeconds: 900,
  maxConcurrent: 1,
  trigger: { type: "interval" as const, every_seconds: 3600 },
};

describe("an agent scheduled on one computer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createDeviceTask as jest.Mock).mockResolvedValue({ id: "task-1", next_run_at: "2026-10-15T02:00:00Z" });
  });

  it("POSTs the agent, its prompt and limits and its time, bound to that computer, to the one door", async () => {
    await createComputerAgentTask(input);
    expect(createDeviceTask).toHaveBeenCalledTimes(1);
    expect(createDeviceTask).toHaveBeenCalledWith({
      device_id: "device-1",
      name: "Morning brief",
      description: null,
      agent: { agent_id: "agent-1", prompt: "Summarise my desktop", variables: { a: 1 }, auth_mode: "ask", max_runtime_seconds: 900, max_concurrent: 1 },
      trigger: { type: "interval", every_seconds: 3600 },
    });
    // A create is never an edit, and an agent task carries no tool.
    expect(updateDeviceTask).not.toHaveBeenCalled();
    expect((createDeviceTask as jest.Mock).mock.calls[0][0]).not.toHaveProperty("tool");
  });

  it("answers with the id the server made, nothing else", async () => {
    await expect(createComputerAgentTask(input)).resolves.toEqual({ id: "task-1" });
  });

  it("writes no scheduler row from the browser", async () => {
    await createComputerAgentTask(input);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(schedulerDb).not.toHaveBeenCalled();
  });

  it("a refusal from the server reaches the caller as is (no row was made, nothing to undo)", async () => {
    (createDeviceTask as jest.Mock).mockRejectedValue(new Error("The schedule's agent was not saved: denied"));
    await expect(createComputerAgentTask(input)).rejects.toThrow("The schedule's agent was not saved: denied");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(schedulerDb).not.toHaveBeenCalled();
  });

  it("needs a name, an agent, a prompt and a time", () => {
    expect(computerAgentErrors({ title: "", prompt: "", agentId: null, triggerType: "event" })).toEqual({
      title: "Name the schedule",
      agentId: "Select the agent",
      prompt: "Say what the agent should do",
      trigger: "On a computer, a schedule runs on a time: every N, a cron, or once",
    });
    expect(computerAgentErrors({ title: "x", prompt: "y", agentId: "a", triggerType: "cron" })).toEqual({});
  });
});
