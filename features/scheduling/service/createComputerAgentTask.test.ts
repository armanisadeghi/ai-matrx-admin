/**
 * Runs on › Run an agent on this computer: an agent-kind task aimed at that computer only
 * (surfaces {desktop}, target_device_id), its agent row, and a time trigger, all in the
 * computer's own organization. A failed agent row undoes the task and says so.
 */
const writes: Array<{ table: string; op: string; row: Record<string, unknown> }> = [];
let failAgent = false;

function table(name: string) {
  return {
    insert: (row: Record<string, unknown>) => {
      writes.push({ table: name, op: "insert", row });
      const result = name === "sch_agent_task" && failAgent ? { error: { message: "denied" } } : { data: { id: "task-1" }, error: null };
      return { ...result, select: () => ({ single: async () => result }), then: (r: (v: unknown) => unknown) => Promise.resolve(result).then(r) };
    },
    update: (row: Record<string, unknown>) => ({ eq: async () => (writes.push({ table: name, op: "update", row }), { error: null }) }),
  };
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: (t: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => (t === "app_instances" ? { data: { organization_id: "org-device" }, error: null } : { data: null, error: null }) }) }) }),
  },
}));
jest.mock("@/utils/supabase/schedulerDb", () => ({ schedulerDb: () => ({ from: table }) }));

import { createComputerAgentTask } from "./queries";
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
    writes.length = 0;
    failAgent = false;
  });

  it("is an agent task for that computer only, in its organization, with its agent and time", async () => {
    await expect(createComputerAgentTask(input)).resolves.toEqual({ id: "task-1" });
    const [task, agent, trigger] = writes;
    expect(task).toMatchObject({ table: "sch_task", row: { kind: "agent", target_device_id: "device-1", surfaces: ["desktop"], organization_id: "org-device", user_id: "user-1" } });
    expect(agent).toMatchObject({ table: "sch_agent_task", row: { id: "task-1", organization_id: "org-device", agent_id: "agent-1", prompt: "Summarise my desktop", max_runtime_seconds: 900 } });
    expect(trigger).toMatchObject({ table: "sch_trigger", row: { task_id: "task-1", type: "interval", config: { every_seconds: 3600 } } });
  });

  it("a refused agent row undoes the task and says so", async () => {
    failAgent = true;
    await expect(createComputerAgentTask(input)).rejects.toThrow("The schedule's agent was not saved: denied");
    expect(writes.some((w) => w.table === "sch_task" && w.op === "update" && w.row.enabled === false)).toBe(true);
    expect(writes.some((w) => w.table === "sch_trigger")).toBe(false);
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
