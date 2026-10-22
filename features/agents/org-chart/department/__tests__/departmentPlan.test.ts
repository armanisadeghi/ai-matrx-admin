import {
  batchInventory,
  breakLoops,
  coerceDepartmentPlan,
  creationOrder,
  inventoryWords,
  placementFor,
  removeSeat,
  seatNextStep,
  seatProblems,
  unfinishedSeats,
  type PlannedSeat,
  type SeatRun,
} from "../departmentPlan";

const seat = (key: string, reportsTo: string | null = null): PlannedSeat => ({
  key,
  name: key,
  description: "",
  goal: `goal ${key}`,
  inputs: [],
  output: "",
  reportsTo,
});

describe("coerceDepartmentPlan", () => {
  it("resolves reports_to by name (any case) into seat keys", () => {
    const plan = coerceDepartmentPlan({
      department: "Front Office",
      seats: [
        { name: "Lead", goal: "g", inputs: [{ name: "day", description: "the day", required: true }], output: "o" },
        { name: "Scheduler", goal: "g", inputs: [], output: "o", reports_to: "lead" },
        { name: "Billing", goal: "g", inputs: [], output: "o", reports_to: "Nobody Here" },
      ],
      questions: ["Is that right?", ""],
    });
    expect(plan.seats.map((s) => s.reportsTo)).toEqual([null, "seat-0", null]);
    expect(plan.seats[0].inputs).toEqual([{ name: "day", description: "the day", required: true }]);
    expect(plan.questions).toEqual(["Is that right?"]);
  });

  it("drops unnamed seats and refuses an empty plan", () => {
    expect(() => coerceDepartmentPlan({ seats: [{ goal: "x" }] })).toThrow(/no positions/);
    expect(() => coerceDepartmentPlan(null)).toThrow();
  });

  it("never lets a seat report to itself", () => {
    const plan = coerceDepartmentPlan({ seats: [{ name: "A", reports_to: "A" }] });
    expect(plan.seats[0].reportsTo).toBeNull();
  });
});

describe("breakLoops", () => {
  it("cuts a two-seat loop and a three-seat loop", () => {
    expect(breakLoops([seat("a", "b"), seat("b", "a")]).filter((s) => s.reportsTo === null).length).toBeGreaterThan(0);
    const three = breakLoops([seat("a", "c"), seat("b", "a"), seat("c", "b")]);
    expect(creationOrder(three)).toHaveLength(3);
  });

  it("clears a manager key that is not in the plan", () => {
    expect(breakLoops([seat("a", "zzz")])[0].reportsTo).toBeNull();
  });
});

describe("creationOrder", () => {
  it("puts managers before the seats under them and keeps plan order otherwise", () => {
    const order = creationOrder([seat("writer", "head"), seat("designer", "head"), seat("head"), seat("analyst", "writer")]);
    const at = (k: string) => order.findIndex((s) => s.key === k);
    expect(order).toHaveLength(4);
    expect(at("head")).toBeLessThan(at("writer"));
    expect(at("head")).toBeLessThan(at("designer"));
    expect(at("writer")).toBeLessThan(at("analyst"));
    expect(at("writer")).toBeLessThan(at("designer"));
  });

  it("creates every seat even when the plan held a loop", () => {
    expect(creationOrder([seat("a", "b"), seat("b", "a"), seat("c")])).toHaveLength(3);
  });
});

describe("removeSeat", () => {
  it("moves the removed seat's reports up to its own manager", () => {
    const after = removeSeat([seat("head"), seat("lead", "head"), seat("rep", "lead")], "lead");
    expect(after.find((s) => s.key === "rep")?.reportsTo).toBe("head");
  });
});

describe("seatProblems", () => {
  it("names a seat with no name or no goal", () => {
    expect(seatProblems([{ ...seat("a"), name: " " }, { ...seat("b"), goal: "" }])).toEqual([
      "Position 1 needs a name.",
      "b needs a goal.",
    ]);
  });
});

describe("placementFor — a seat never stands in under the box for a missing manager", () => {
  it("waits while its manager seat has no position", () => {
    expect(placementFor(seat("b", "a"), {})).toEqual({ kind: "waiting", managerKey: "a" });
    expect(placementFor(seat("b", "a"), { a: { error: "refused" } })).toEqual({ kind: "waiting", managerKey: "a" });
  });
  it("goes under the manager once it exists, and under the box when it has none", () => {
    expect(placementFor(seat("b", "a"), { a: { positionId: "p-a" } })).toEqual({ kind: "under-seat", positionId: "p-a" });
    expect(placementFor(seat("a"), {})).toEqual({ kind: "under-box" });
  });
});

describe("seatNextStep — Retry resumes, never repeats", () => {
  it("walks position → place → job → link → done", () => {
    expect(seatNextStep(undefined)).toBe("position");
    expect(seatNextStep({ positionId: "p" })).toBe("place");
    expect(seatNextStep({ positionId: "p", placed: true })).toBe("job");
    expect(seatNextStep({ positionId: "p", placed: true, mandateId: "m" })).toBe("link-job");
    expect(seatNextStep({ positionId: "p", placed: true, mandateId: "m", jobLinked: true })).toBe("done");
  });
  it("a job made but not linked is re-linked, not made again", () => {
    expect(seatNextStep({ positionId: "p", placed: true, mandateId: "m", jobLinked: false })).toBe("link-job");
  });
  it("lists the unfinished seats, managers first", () => {
    const order = creationOrder([seat("b", "a"), seat("a"), seat("c")]);
    const runs: Record<string, SeatRun> = {
      a: { positionId: "pa", placed: true, mandateId: "ma", jobLinked: true },
      b: { waitingOn: "a" },
    };
    expect(unfinishedSeats(order, runs).map((s) => s.key)).toEqual(["b", "c"]);
  });
});

describe("batchInventory / inventoryWords — Undo takes back everything the run recorded", () => {
  const order = [seat("a"), seat("b", "a"), seat("c")];
  const runs: Record<string, SeatRun> = {
    a: { positionId: "pa", placed: true, mandateId: "ma", jobLinked: true, agentId: "ga" },
    b: { positionId: "pb", placed: true, mandateId: "mb", jobLinked: false, unboundAgentId: "gb" },
    c: {},
  };
  it("collects positions, jobs (linked or not), agents (bound or not) and the leader", () => {
    const inv = batchInventory(order, runs, { conductorId: "lead", placedUnder: "team:t" });
    expect(inv.positions.map((p) => p.positionId)).toEqual(["pa", "pb"]);
    expect(inv.jobs).toEqual(["ma", "mb"]);
    expect(inv.agents).toEqual(["ga", "gb"]);
    expect(inv.leaderId).toBe("lead");
    expect(inv.leaderPlacedUnder).toBe("team:t");
    expect(inventoryWords(inv)).toBe("2 positions, 2 jobs, 2 agents and the leader");
  });
  it("says one position, not '1 positions'", () => {
    const inv = batchInventory([seat("a")], { a: { positionId: "pa" } }, null);
    expect(inventoryWords(inv)).toBe("1 position");
  });
});
