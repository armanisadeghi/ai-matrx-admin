/**
 * Pure helpers for reading and building `VariableCustomComponent` values
 * with stash-based cross-type preservation.
 *
 * Contract:
 *   • When a field belongs to the current type (per component-type meta),
 *     it lives at the top level of the custom component.
 *   • When a field doesn't belong to the current type, it lives under `stash`.
 *   • Readers prefer top-level, fall back to stash — so the UI can show
 *     preserved values even for types that don't use them.
 */

import type {
  VariableComponentType,
  VariableCustomComponent,
} from "@/features/agents/types/agent-definition.types";
import { getComponentTypeMeta } from "@/features/agents/components/inputs/variable-input-variations/variable-input-options";

type StashableKey =
  | "options"
  | "allowOther"
  | "toggleValues"
  | "min"
  | "max"
  | "step";

const STASHABLE_KEYS: StashableKey[] = [
  "options",
  "allowOther",
  "toggleValues",
  "min",
  "max",
  "step",
];

/** True when the given field is part of the live shape of the given type. */
export function fieldBelongsToType(
  field: StashableKey,
  type: VariableComponentType,
): boolean {
  const meta = getComponentTypeMeta(type);
  switch (field) {
    case "options":
    case "allowOther":
      return meta.requiresOptions;
    case "toggleValues":
      return meta.requiresToggleValues;
    case "min":
    case "max":
    case "step":
      return meta.requiresMinMax || type === "number";
  }
}

// ─── Readers ──────────────────────────────────────────────────────────────────

export function readOptions(cc: VariableCustomComponent | undefined): string[] {
  if (!cc) return [];
  if (cc.options !== undefined) return cc.options;
  if (cc.stash?.options !== undefined) return cc.stash.options;
  return [];
}

export function readAllowOther(
  cc: VariableCustomComponent | undefined,
): boolean {
  if (!cc) return false;
  if (cc.allowOther !== undefined) return cc.allowOther;
  if (cc.stash?.allowOther !== undefined) return cc.stash.allowOther;
  return false;
}

export function readToggleValues(
  cc: VariableCustomComponent | undefined,
): [string, string] {
  if (cc?.toggleValues) return cc.toggleValues;
  if (cc?.stash?.toggleValues) return cc.stash.toggleValues;
  return ["No", "Yes"];
}

export function readMin(
  cc: VariableCustomComponent | undefined,
): number | undefined {
  return cc?.min ?? cc?.stash?.min;
}

export function readMax(
  cc: VariableCustomComponent | undefined,
): number | undefined {
  return cc?.max ?? cc?.stash?.max;
}

export function readStep(cc: VariableCustomComponent | undefined): number {
  return cc?.step ?? cc?.stash?.step ?? 1;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export interface BuildCustomComponentInput {
  type: VariableComponentType;
  options?: string[];
  allowOther?: boolean;
  toggleValues?: [string, string];
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Rebuild a VariableCustomComponent from effective values. Fields belonging
 * to the current type go top-level; the rest are stashed.
 *
 * Returns `undefined` for textarea with no stashed config — preserves the
 * "no customComponent means default text" invariant.
 */
export function buildCustomComponent(
  input: BuildCustomComponentInput,
): VariableCustomComponent | undefined {
  const { type } = input;
  const cc: VariableCustomComponent = { type };
  const stash: NonNullable<VariableCustomComponent["stash"]> = {};

  const source: Record<StashableKey, unknown> = {
    options: input.options,
    allowOther: input.allowOther,
    toggleValues: input.toggleValues,
    min: input.min,
    max: input.max,
    step: input.step,
  };

  for (const field of STASHABLE_KEYS) {
    const value = source[field];
    if (value === undefined) continue;

    // Skip defaults — keeps saved JSON clean and avoids noisy dirty flags.
    if (field === "options" && Array.isArray(value) && value.length === 0) continue;
    if (field === "allowOther" && value === false) continue;
    if (field === "step" && value === 1) continue;
    if (
      field === "toggleValues" &&
      Array.isArray(value) &&
      value[0] === "No" &&
      value[1] === "Yes"
    ) {
      continue;
    }

    if (fieldBelongsToType(field, type)) {
      (cc as unknown as Record<string, unknown>)[field] = value;
    } else {
      (stash as unknown as Record<string, unknown>)[field] = value;
    }
  }

  if (Object.keys(stash).length > 0) {
    cc.stash = stash;
  }

  if (type === "textarea" && !cc.stash) return undefined;
  return cc;
}

/**
 * Extract effective values from a customComponent for use in editor state.
 * Pulls from top-level first, then stash.
 */
export function extractEffectiveValues(
  cc: VariableCustomComponent | undefined,
): Required<Omit<BuildCustomComponentInput, "type">> & {
  type: VariableComponentType;
} {
  return {
    type: cc?.type ?? "textarea",
    options: readOptions(cc),
    allowOther: readAllowOther(cc),
    toggleValues: readToggleValues(cc),
    min: readMin(cc) as number,
    max: readMax(cc) as number,
    step: readStep(cc),
  };
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Pre-save cleanup: strip empty stash, drop textarea-with-nothing to undefined.
 * Idempotent.
 */
export function normalizeCustomComponent(
  cc: VariableCustomComponent | undefined,
): VariableCustomComponent | undefined {
  if (!cc) return undefined;

  let next: VariableCustomComponent = { ...cc };
  if (next.stash && Object.keys(next.stash).length === 0) {
    const { stash: _drop, ...rest } = next;
    next = rest;
  }

  if (next.type === "textarea" && !next.stash) return undefined;
  return next;
}
