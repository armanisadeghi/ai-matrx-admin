/**
 * Battle columns → test-run setups (Agent Evaluation PLAN P4, "Run on server").
 *
 * A battle run on the server is a test run with one setup per column through the ONE eval runner
 * (`launchBattle`, `@/features/agent-tests/battle`). This module only names what each column
 * runs, from what the column already holds:
 *
 * - its agent (Open: each column's own agent; locked modes: the source agent),
 * - its pinned version (resolved to the version id at launch),
 * - a synthetic `cmp-` copy (System prompt / Tuning / Variations): the copy's messages, settings
 *   and model ride the patch — held only by the run, so the runner sends them on the manual door,
 * - the column's own model and setting overrides (`config_overrides` delta).
 *
 * The cases are the first column's agent's test cases (CONTRACT §4.1, case ownership).
 * A mode whose columns the runner cannot carry says why instead of running something else.
 */

import type { BattleSetup } from "@/features/agent-tests/service";
import type { BattleColumnDescriptor } from "./activeBattleColumns";
import type { BattleModeId } from "./battleRoutes";

export const SYNTHETIC_PREFIX = "cmp-";

/** What one column's conversation holds, read from the store by the caller. */
export interface ColumnFacts {
  /** The instance's agent id (a `cmp-` id for a synthetic variant). */
  instanceAgentId: string | null;
  /** The synthetic copy's definition, when the instance runs one. */
  synthetic: { messages: unknown[]; settings: Record<string, unknown>; modelId: string | null } | null;
  /** `config_overrides` delta for the column (model included as `model`). */
  overrides: Record<string, unknown> | null;
}

export interface PlannedSetup {
  setup: BattleSetup;
  /** A pinned version number the launcher resolves to `patch.agent_version_id`. */
  versionNumber: number | null;
}

export type BattleTestPlan =
  | { ok: true; caseAgentId: string; setups: PlannedSetup[] }
  | { ok: false; reason: string };

/** Modes whose columns the runner cannot carry, and why (shown on the panel). */
const UNSUPPORTED: Partial<Record<BattleModeId, string>> = {
  conversation: "Forks continue one conversation; cases start their own",
  matrix: "The matrix already runs on the server",
  "request-mod": "Columns vary the request; cases bring their own",
  tools: "Tool changes do not reach the server run yet",
};

export function planBattleTests(
  mode: BattleModeId | null,
  columns: readonly BattleColumnDescriptor[],
  factsOf: (column: BattleColumnDescriptor) => ColumnFacts,
  labelOf: (column: BattleColumnDescriptor, index: number) => string,
): BattleTestPlan {
  if (!mode) return { ok: false, reason: "No battle on screen" };
  const unsupported = UNSUPPORTED[mode];
  if (unsupported) return { ok: false, reason: unsupported };
  const active = columns.filter((c) => !c.paused);
  if (active.length < 2) return { ok: false, reason: "Add a second column" };
  const caseAgentId = active[0].agentId;
  if (!caseAgentId) return { ok: false, reason: "Pick an agent in the first column" };

  const setups: PlannedSetup[] = [];
  for (const [index, column] of active.entries()) {
    if (!column.agentId) return { ok: false, reason: `Pick an agent in column ${index + 1}` };
    const facts = factsOf(column);
    const patch: NonNullable<BattleSetup["patch"]> = {};
    if (facts.synthetic) {
      patch.messages = facts.synthetic.messages;
      if (Object.keys(facts.synthetic.settings).length > 0) patch.settings = { ...facts.synthetic.settings };
      if (facts.synthetic.modelId) patch.model_id = facts.synthetic.modelId;
    }
    const { model, ...settingOverrides } = facts.overrides ?? {};
    if (typeof model === "string" && model) patch.model_id = model;
    if (Object.keys(settingOverrides).length > 0) patch.settings = { ...(patch.settings ?? {}), ...settingOverrides };
    // The id's own field, never the copy's: the runner reads only real agents.
    if (patch.settings) delete patch.settings.model_id;
    setups.push({
      setup: {
        key: column.columnId,
        label: labelOf(column, index),
        holder: { kind: "agent", id: column.agentId },
        ...(Object.keys(patch).length > 0 ? { patch } : {}),
        entry_id: column.columnId,
      },
      versionNumber: typeof column.agentVersion === "number" ? column.agentVersion : null,
    });
  }
  return { ok: true, caseAgentId, setups };
}

/** Lay the resolved version ids on the setups; a number with no id is refused by name. */
export function withVersionIds(
  planned: readonly PlannedSetup[],
  versionIdOf: (agentId: string, versionNumber: number) => string | undefined,
): { setups: BattleSetup[] } | { reason: string } {
  const setups: BattleSetup[] = [];
  for (const p of planned) {
    if (p.versionNumber === null) {
      setups.push(p.setup);
      continue;
    }
    const id = versionIdOf(p.setup.holder.id, p.versionNumber);
    if (!id) return { reason: `Version ${p.versionNumber} of ${p.setup.label} was not found` };
    setups.push({ ...p.setup, patch: { ...(p.setup.patch ?? {}), agent_version_id: id } });
  }
  return { setups };
}
