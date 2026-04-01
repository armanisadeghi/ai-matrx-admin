/**
 * Instance Variable Values Selectors
 *
 * CRITICAL: All selectors take only instanceId — never agentId.
 * Variable definitions are owned by the instance (copied at creation time).
 * The agent definition slice is never accessed from here.
 */

import type { RootState } from "@/lib/redux/store";
import type { VariableDefinition } from "@/features/agents/redux/agent-definition/types";

/**
 * The instance's snapshotted variable definitions (copied from agent at creation).
 * Safe to call even if the source agent no longer exists.
 */
export const selectInstanceVariableDefinitions =
  (instanceId: string) =>
  (state: RootState): VariableDefinition[] =>
    state.instanceVariableValues.byInstanceId[instanceId]?.definitions ?? [];

/**
 * Raw user-provided values for an instance.
 */
export const selectUserVariableValues =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> =>
    state.instanceVariableValues.byInstanceId[instanceId]?.userValues ?? {};

/**
 * Raw scope-resolved values for an instance.
 */
export const selectScopeVariableValues =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> =>
    state.instanceVariableValues.byInstanceId[instanceId]?.scopeValues ?? {};

/**
 * Fully resolved variables — the three-tier merge.
 *
 * Priority: user-provided > scope-resolved > definition defaults
 *
 * Uses the instance's OWN definition snapshot — no agentId needed.
 * This is what the execution thunk reads when building the API payload.
 */
export const selectResolvedVariables =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> => {
    const entry = state.instanceVariableValues.byInstanceId[instanceId];
    if (!entry) return {};

    const { definitions, userValues, scopeValues } = entry;
    const resolved: Record<string, unknown> = {};

    for (const def of definitions) {
      if (def.name in userValues) {
        resolved[def.name] = userValues[def.name];
      } else if (def.name in scopeValues) {
        resolved[def.name] = scopeValues[def.name];
      } else if (def.defaultValue !== undefined && def.defaultValue !== null) {
        resolved[def.name] = def.defaultValue;
      } else {
        resolved[def.name] = null;
      }
    }

    return resolved;
  };

/**
 * Variables that are required but have no value.
 * Used by the UI to show validation errors before execution.
 */
export const selectMissingRequiredVariables =
  (instanceId: string) =>
  (state: RootState): string[] => {
    const entry = state.instanceVariableValues.byInstanceId[instanceId];
    if (!entry) return [];

    const resolved = selectResolvedVariables(instanceId)(state);

    return entry.definitions
      .filter(
        (def) =>
          def.required &&
          (resolved[def.name] === null ||
            resolved[def.name] === undefined ||
            resolved[def.name] === ""),
      )
      .map((def) => def.name);
  };

/**
 * For each variable, where did its value come from?
 * Useful for the UI to show provenance indicators.
 */
export const selectVariableProvenance =
  (instanceId: string) =>
  (state: RootState): Record<string, "user" | "scope" | "default" | "none"> => {
    const entry = state.instanceVariableValues.byInstanceId[instanceId];
    if (!entry) return {};

    const { definitions, userValues, scopeValues } = entry;
    const provenance: Record<string, "user" | "scope" | "default" | "none"> = {};

    for (const def of definitions) {
      if (def.name in userValues) {
        provenance[def.name] = "user";
      } else if (def.name in scopeValues) {
        provenance[def.name] = "scope";
      } else if (def.defaultValue !== undefined && def.defaultValue !== null) {
        provenance[def.name] = "default";
      } else {
        provenance[def.name] = "none";
      }
    }

    return provenance;
  };
