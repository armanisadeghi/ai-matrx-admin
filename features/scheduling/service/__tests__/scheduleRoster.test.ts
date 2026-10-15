/**
 * The /schedules list shows every schedule the person owns — a coding session on a computer
 * (kind device_op) included, labelled by its own work — never only agent rows (the re-walk: a new
 * computer schedule missing from "7 schedules"). The query is recorded at the supabase seam.
 */
const filters: Array<[string, unknown]> = [];
const rows = [
  { id: "a", kind: "agent", surfaces: ["server"], metadata: {}, agent: { agent_id: "ag", prompt: "Hi", variables: {}, persistent_conversation_id: null, auth_mode: "ask", max_runtime_seconds: 600, max_concurrent: 1 }, triggers: [] },
  { id: "c", kind: "device_op", surfaces: ["desktop"], target_device_id: "dev-1", metadata: { device_op: { op: "coding.start", params: { provider: "claude", cwd: "/w", prompt: "Tidy" } } }, agent: null, triggers: [] },
];

function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  let inner = false;
  for (const m of ["is", "order", "range", "abortSignal", "schema", "from"]) c[m] = () => c;
  // PostgREST semantics: an `!inner` embed drops every row with no embedded row.
  c.select = (cols: string) => ((inner = /sch_agent_task!inner/.test(cols)), c);
  c.eq = (k: string, v: unknown) => (filters.push([`eq:${k}`, v]), c);
  c.in = (k: string, v: unknown) => (filters.push([`in:${k}`, v]), c);
  c.returns = () => {
    const kinds = filters.find(([k]) => k === "in:kind")?.[1] as string[] | undefined;
    const only = filters.find(([k]) => k === "eq:kind")?.[1];
    const data = rows.filter((r) => (kinds ? kinds.includes(r.kind) : only ? r.kind === only : true)).filter((r) => !inner || r.agent !== null);
    return Promise.resolve({ data, error: null, count: data.length });
  };
  return c;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/schedulerDb", () => ({ schedulerDb: () => chain() }));

describe("the schedule list", () => {
  it("shows a coding session on a computer beside the agents, with its work", async () => {
    const { listAgentTasks } = await import("../queries");
    const list = await listAgentTasks();
    const computer = list.find((t) => t.id === "c");
    expect(list.map((t) => t.id).sort()).toEqual(["a", "c"]);
    expect(computer?.kind).toBe("device_op");
    expect(computer?.deviceOp).toMatchObject({ folder: "/w", prompt: "Tidy" });
  });
});

describe("a computer row in the schedule list", () => {
  it("reads what runs where, from the same list path (never the Desktop app surface)", async () => {
    const { listAgentTasks } = await import("../queries");
    const { computerScheduleLabel } = await import("../../utils/computerWork");
    const list = await listAgentTasks();
    expect(computerScheduleLabel(list.find((t) => t.id === "c")!, "Studio")).toBe("Coding session on Studio");
    expect(computerScheduleLabel(list.find((t) => t.id === "a")!, "Studio")).toBeNull();
    expect(computerScheduleLabel({ kind: "agent", targetDeviceId: "d", surfaces: ["desktop"] }, "Studio")).toBe("Agent on Studio");
  });
});
