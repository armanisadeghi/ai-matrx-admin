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
