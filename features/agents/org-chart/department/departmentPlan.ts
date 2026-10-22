// features/agents/org-chart/department/departmentPlan.ts
//
// The department plan (vision rule 5: "8 roles, they are…" → seats, jobs,
// agents, Orchestra) as the dialog edits it, and the order its seats are
// created in. Pure: no React, no reads. Jest-pinned in
// `__tests__/departmentPlan.test.ts`.
//
// The planner (`org_chart.department_planner`, kind `department_plan`) names a
// seat's manager by NAME; the editor keys every seat so a rename never breaks
// who sits under whom.

import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

export interface PlannedInput {
  name: string;
  description: string;
  required: boolean;
}

export interface PlannedSeat {
  key: string;
  name: string;
  description: string;
  goal: string;
  inputs: PlannedInput[];
  output: string;
  /** Key of another seat in the plan it sits under; null = directly under the chosen box. */
  reportsTo: string | null;
}

export interface DepartmentPlan {
  department: string;
  seats: PlannedSeat[];
  questions: string[];
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Narrow the planner's answer. Throws when it holds no seat at all. */
export function coerceDepartmentPlan(value: unknown, makeKey: (i: number) => string = (i) => `seat-${i}`): DepartmentPlan {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const rawSeats = Array.isArray(raw.seats) ? raw.seats : [];
  const named = rawSeats
    .map((s) => (s && typeof s === "object" ? (s as Record<string, unknown>) : null))
    .filter((s): s is Record<string, unknown> => Boolean(s && str(s.name)));
  if (named.length === 0) throw new Error("The plan came back with no positions. Try describing the roles.");
  const keyByName = new Map<string, string>();
  const seats = named.map((s, i): PlannedSeat => {
    const key = makeKey(i);
    const name = str(s.name);
    if (!keyByName.has(name.toLowerCase())) keyByName.set(name.toLowerCase(), key);
    return {
      key,
      name,
      description: str(s.description),
      goal: str(s.goal),
      inputs: (Array.isArray(s.inputs) ? s.inputs : [])
        .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => Boolean(x && (str(x.name) || str(x.description))))
        .map((x) => ({ name: str(x.name), description: str(x.description) || str(x.name), required: x.required !== false })),
      output: str(s.output),
      reportsTo: str(s.reports_to) || null, // a NAME for now; resolved below
    };
  });
  for (const seat of seats) {
    const target = seat.reportsTo ? keyByName.get(seat.reportsTo.toLowerCase()) : undefined;
    seat.reportsTo = target && target !== seat.key ? target : null;
  }
  return {
    department: str(raw.department),
    seats: breakLoops(seats),
    questions: (Array.isArray(raw.questions) ? raw.questions : []).map(str).filter(Boolean),
  };
}

/** A seat whose chain of managers comes back to itself sits directly under the box instead. */
export function breakLoops(seats: PlannedSeat[]): PlannedSeat[] {
  const byKey = new Map(seats.map((s) => [s.key, s]));
  const out = seats.map((s) => ({ ...s, reportsTo: s.reportsTo && byKey.has(s.reportsTo) ? s.reportsTo : null }));
  const outByKey = new Map(out.map((s) => [s.key, s]));
  for (const seat of out) {
    const seen = new Set<string>([seat.key]);
    let cur = seat.reportsTo;
    while (cur) {
      if (seen.has(cur)) {
        seat.reportsTo = null;
        break;
      }
      seen.add(cur);
      cur = outByKey.get(cur)?.reportsTo ?? null;
    }
  }
  return out;
}

/** Remove a seat; the seats under it move up to its own manager. */
export function removeSeat(seats: PlannedSeat[], key: string): PlannedSeat[] {
  const gone = seats.find((s) => s.key === key);
  return seats
    .filter((s) => s.key !== key)
    .map((s) => (s.reportsTo === key ? { ...s, reportsTo: gone?.reportsTo ?? null } : s));
}

/**
 * Managers before the seats under them, so each seat can be placed the moment
 * it exists. Plan order is kept wherever the tree allows it.
 */
export function creationOrder(seats: PlannedSeat[]): PlannedSeat[] {
  const clean = breakLoops(seats);
  const done = new Set<string>();
  const order: PlannedSeat[] = [];
  while (order.length < clean.length) {
    const next = clean.find((s) => !done.has(s.key) && (!s.reportsTo || done.has(s.reportsTo)));
    if (!next) break; // unreachable after breakLoops; never spin
    done.add(next.key);
    order.push(next);
  }
  return order;
}

/** What a seat needs before it can be created: a name and a goal. */
export function seatProblems(seats: PlannedSeat[]): string[] {
  const problems: string[] = [];
  seats.forEach((s, i) => {
    if (!s.name.trim()) problems.push(`Position ${i + 1} needs a name.`);
    else if (!s.goal.trim()) problems.push(`${s.name} needs a goal.`);
  });
  return problems;
}

// ── the batch run: what each seat reached, what comes next, what Undo takes back ──

/** What one seat of a batch has reached. Every id it records is what Retry resumes from and Undo takes back. */
export interface SeatRun {
  positionId?: string;
  /** Placed under its manager (or the chosen box). Never set while its manager does not exist yet. */
  placed?: boolean;
  mandateId?: string;
  mandateKey?: AnyMandateKey;
  /** The job is linked to the position. A job made but not linked is re-linked by Retry, never made again. */
  jobLinked?: boolean;
  agentId?: string;
  /** The agent exists but has not taken the job yet. */
  unboundAgentId?: string;
  /** Key of the seat it sits under, while that seat has no position yet. */
  waitingOn?: string | null;
  busy?: string | null;
  error?: string | null;
}

export type SeatStep = "position" | "place" | "job" | "link-job" | "done";

/** The next write a seat needs to finish its part of "Create" (agents are a later, separate step). */
export function seatNextStep(run: SeatRun | undefined): SeatStep {
  if (!run?.positionId) return "position";
  if (!run.placed) return "place";
  if (!run.mandateId) return "job";
  if (!run.jobLinked) return "link-job";
  return "done";
}

/**
 * Where a seat goes on the chart. A seat whose manager seat has no position
 * yet WAITS — it is never dropped under the chosen box in its place.
 */
export function placementFor(
  seat: Pick<PlannedSeat, "reportsTo">,
  runs: Record<string, SeatRun>,
): { kind: "under-seat"; positionId: string } | { kind: "under-box" } | { kind: "waiting"; managerKey: string } {
  if (!seat.reportsTo) return { kind: "under-box" };
  const managerPosition = runs[seat.reportsTo]?.positionId;
  return managerPosition ? { kind: "under-seat", positionId: managerPosition } : { kind: "waiting", managerKey: seat.reportsTo };
}

/** Seats of the batch whose "Create" part is not finished, managers first. */
export function unfinishedSeats(order: PlannedSeat[], runs: Record<string, SeatRun>): PlannedSeat[] {
  return order.filter((s) => seatNextStep(runs[s.key]) !== "done");
}

/** What a batch made, by kind — everything Undo takes back. */
export interface BatchInventory {
  positions: { seatKey: string; positionId: string; name: string; mandateId: string | null; description: string | null }[];
  jobs: string[];
  agents: string[];
  leaderId: string | null;
  /** The leader's placement under the chosen box, when it was made. */
  leaderPlacedUnder: string | null;
}

export function batchInventory(
  order: PlannedSeat[],
  runs: Record<string, SeatRun>,
  leader: { conductorId: string; placedUnder: string | null } | null,
): BatchInventory {
  const inv: BatchInventory = { positions: [], jobs: [], agents: [], leaderId: leader?.conductorId ?? null, leaderPlacedUnder: leader?.placedUnder ?? null };
  for (const s of order) {
    const r = runs[s.key];
    if (!r) continue;
    if (r.positionId)
      inv.positions.push({ seatKey: s.key, positionId: r.positionId, name: s.name, mandateId: r.mandateId ?? null, description: s.description || null });
    if (r.mandateId) inv.jobs.push(r.mandateId);
    const agent = r.agentId ?? r.unboundAgentId;
    if (agent) inv.agents.push(agent);
  }
  return inv;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 positions, 3 jobs, 2 agents and the leader" — what Undo took back, in words. */
export function inventoryWords(inv: BatchInventory): string {
  const parts = [
    inv.positions.length ? count(inv.positions.length, "position", "positions") : null,
    inv.jobs.length ? count(inv.jobs.length, "job", "jobs") : null,
    inv.agents.length ? count(inv.agents.length, "agent", "agents") : null,
    inv.leaderId ? "the leader" : null,
  ].filter((x): x is string => Boolean(x));
  if (parts.length <= 1) return parts[0] ?? "nothing";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export type DepartmentStep = "describe" | "review" | "made";

/** One "Plan a department" batch, kept in Redux (`orchestras.departmentRuns`) so it outlives the dialog. */
export interface DepartmentRun {
  step: DepartmentStep;
  /** Every write of the batch names this organization: the chosen box's own. */
  organizationId: string;
  description: string;
  plan: DepartmentPlan | null;
  runs: Record<string, SeatRun>;
  /** What is running now ("seats", "agents", "orchestra", "undo", "retry"); null = nothing. */
  working: string | null;
  leaderName: string;
  leader: { conductorId: string; placedUnder: string | null; warnings: string[] } | null;
  /** The leader's creation failed (its reason is read from the creator, after the request). */
  leaderFailed: boolean;
  undone: boolean;
  error: string | null;
}

/** The box a batch goes under keys its run; one batch per box at a time. */
export const departmentRunKey = (underBoxId: string | null) => underBoxId ?? "top";
