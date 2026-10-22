// Agent writes on /workflows/[id]/triggers (surface `matrx-user/workflow-triggers`):
// pure readers of the agent's value and the row shape the surface emits. Saving
// goes through `useWorkflowTriggers` (create / setActive), the doors the page's
// own form and switches use.

import { validateCron } from "@ai-matrx/data/scheduler";
import {
  collectProblems,
  ListLevelProblem,
  ProblemList,
  readCollectionList,
  repeatsProblem,
} from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";

import { describeRecurrence, fromCron } from "./recurrence";
import type { WorkflowTrigger } from "./types";

/** One trigger as the surface shows it to an agent (never a webhook secret: none is ever read). */
export function triggerSurfaceRow(t: WorkflowTrigger) {
  return {
    id: t.id,
    name: t.name,
    kind: t.kind,
    schedule: t.kind === "cron" && t.cronExpression ? describeRecurrence(fromCron(t.cronExpression)) : null,
    cron_expression: t.cronExpression,
    timezone: t.timezone,
    active: t.isActive,
    default_inputs: t.defaultInputs,
    next_run_at: t.nextRunAt,
    last_fired_at: t.lastFiredAt,
    last_run_id: t.lastRunId,
    fire_count: t.fireCount,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nameOf(raw: unknown): string | null {
  return isRecord(raw) && typeof raw.name === "string" ? raw.name : null;
}

export interface NewSchedulePlan {
  name: string;
  cronExpression: string;
  timezone: string;
  defaultInputs: Record<string, unknown>;
}

/** create_triggers: schedules only (an address needs a password the person must copy). */
export function parseNewSchedules(
  target: string,
  value: unknown,
  fallbackTimezone: string,
): NewSchedulePlan[] {
  const items = readCollectionList(target, "triggers", value, 10);
  return collectProblems(
    target,
    items,
    (raw) => {
      const problems = new ProblemList(target);
      if (!isRecord(raw)) throw new Error("Each item must be an object.");
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      if (!name) problems.add('"name" is required.');
      if (name.length > 255) problems.add('"name" is longer than 255 characters.');
      const cron = typeof raw.cron_expression === "string" ? raw.cron_expression.trim() : "";
      const timezone =
        typeof raw.timezone === "string" && raw.timezone.trim() ? raw.timezone.trim() : fallbackTimezone;
      if (!cron) problems.add('"cron_expression" is required (5 fields, e.g. "0 8 * * 1-5").');
      else problems.add(validateCron(cron, timezone));
      if (raw.default_inputs !== undefined && !isRecord(raw.default_inputs)) {
        problems.add('"default_inputs" must be an object of input name to value.');
      }
      if (raw.kind !== undefined && raw.kind !== "cron") {
        problems.add('Only schedules ("kind": "cron") can be added here; an address is set up by the person.');
      }
      for (const key of Object.keys(raw)) {
        if (!["name", "kind", "cron_expression", "timezone", "default_inputs"].includes(key)) {
          problems.add(`Unknown field "${key}".`);
        }
      }
      problems.throwIfAny();
      return {
        name,
        cronExpression: cron,
        timezone,
        defaultInputs: isRecord(raw.default_inputs) ? raw.default_inputs : {},
      };
    },
    {
      nameOf,
      listChecks: (checked) => [repeatsProblem(target, checked.map((c) => nameOf(c.raw)), "name")],
    },
  );
}

export interface TriggerActivePlan {
  id: string;
  name: string;
  active: boolean;
}

/** update_triggers: turn triggers on or off — the only change the page's cards make. */
export function parseTriggerUpdates(
  target: string,
  value: unknown,
  triggers: readonly WorkflowTrigger[],
): TriggerActivePlan[] {
  const items = readCollectionList(target, "triggers", value, 25);
  const byId = new Map(triggers.map((t) => [t.id, t]));
  return collectProblems(
    target,
    items,
    (raw) => {
      const id = isRecord(raw) && typeof raw.id === "string" ? raw.id : null;
      const trigger = id ? byId.get(id) : undefined;
      if (!trigger) throw new ListLevelProblem(`Unknown trigger id ${JSON.stringify(id)} — use an id from triggers.`);
      const problems = new ProblemList(target);
      const record = raw as Record<string, unknown>;
      if (typeof record.active !== "boolean") problems.add('"active" must be true or false.');
      for (const key of Object.keys(record)) {
        if (!["id", "active"].includes(key)) problems.add(`"${key}" cannot be changed here; only "active".`);
      }
      problems.throwIfAny();
      return { id: trigger.id, name: trigger.name, active: record.active as boolean };
    },
    {
      nameOf: (raw) => (isRecord(raw) && typeof raw.id === "string" ? raw.id : null),
      listChecks: (checked) => [
        repeatsProblem(
          target,
          checked.map((c) => (isRecord(c.raw) && typeof c.raw.id === "string" ? c.raw.id : null)),
          "id",
        ),
      ],
    },
  );
}
