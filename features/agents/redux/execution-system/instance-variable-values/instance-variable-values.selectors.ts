/**
 * Instance Variable Values Selectors
 *
 * CRITICAL: All selectors take only instanceId — never agentId.
 * Variable definitions are owned by the instance (copied at creation time).
 * The agent definition slice is never accessed from here.
 *
 * Stable empty constants are hoisted at module level so selectors always return
 * the same reference when the instance entry doesn't exist yet — preventing
 * spurious re-renders from inline `?? []` / `?? {}` literals.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";

// Stable references returned when the instance hasn't been initialized yet.
const EMPTY_DEFINITIONS: VariableDefinition[] = [];
const EMPTY_RECORD: Record<string, unknown> = {};
const EMPTY_NAMES: string[] = [];
const EMPTY_PROVENANCE: Record<string, "user" | "scope" | "default" | "none"> =
  {};

/**
 * The instance's snapshotted variable definitions (copied from agent at creation).
 * Safe to call even if the source agent no longer exists.
 */
export const selectInstanceVariableDefinitions =
  (instanceId: string) =>
  (state: RootState): VariableDefinition[] =>
    state.instanceVariableValues.byInstanceId[instanceId]?.definitions ??
    EMPTY_DEFINITIONS;

/**
 * Raw user-provided values for an instance.
 */
export const selectUserVariableValues =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> =>
    state.instanceVariableValues.byInstanceId[instanceId]?.userValues ??
    EMPTY_RECORD;

/**
 * Raw scope-resolved values for an instance.
 */
export const selectScopeVariableValues =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> =>
    state.instanceVariableValues.byInstanceId[instanceId]?.scopeValues ??
    EMPTY_RECORD;

/**
 * Fully resolved variables — the three-tier merge.
 * Priority: user-provided > scope-resolved > definition defaults
 *
 * Memoized with createSelector so the derived object is only rebuilt when
 * the underlying entry actually changes.
 */
export const selectResolvedVariables = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceVariableValues.byInstanceId[instanceId],
    (entry) => {
      if (!entry) return EMPTY_RECORD;

      const { definitions, userValues, scopeValues } = entry;
      const resolved: Record<string, unknown> = {};

      for (const def of definitions) {
        if (def.name in userValues) {
          resolved[def.name] = userValues[def.name];
        } else if (def.name in scopeValues) {
          resolved[def.name] = scopeValues[def.name];
        } else if (
          def.defaultValue !== undefined &&
          def.defaultValue !== null
        ) {
          resolved[def.name] = def.defaultValue;
        } else {
          resolved[def.name] = null;
        }
      }

      return resolved;
    },
  );

/**
 * Variables that are required but have no value.
 * Used by the UI to show validation errors before execution.
 */
export const selectMissingRequiredVariables = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceVariableValues.byInstanceId[instanceId],
    (entry) => {
      if (!entry) return EMPTY_NAMES;

      const { definitions, userValues, scopeValues } = entry;

      const missing = definitions
        .filter((def) => {
          if (!def.required) return false;
          if (def.name in userValues) {
            const v = userValues[def.name];
            return v === null || v === undefined || v === "";
          }
          if (def.name in scopeValues) {
            const v = scopeValues[def.name];
            return v === null || v === undefined || v === "";
          }
          return (
            def.defaultValue === undefined ||
            def.defaultValue === null ||
            def.defaultValue === ""
          );
        })
        .map((def) => def.name);

      return missing.length === 0 ? EMPTY_NAMES : missing;
    },
  );

/**
 * For each variable, where did its value come from?
 * Useful for the UI to show provenance indicators.
 */
export const selectVariableProvenance = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceVariableValues.byInstanceId[instanceId],
    (entry) => {
      if (!entry) return EMPTY_PROVENANCE;

      const { definitions, userValues, scopeValues } = entry;
      const provenance: Record<string, "user" | "scope" | "default" | "none"> =
        {};

      for (const def of definitions) {
        if (def.name in userValues) {
          provenance[def.name] = "user";
        } else if (def.name in scopeValues) {
          provenance[def.name] = "scope";
        } else if (
          def.defaultValue !== undefined &&
          def.defaultValue !== null
        ) {
          provenance[def.name] = "default";
        } else {
          provenance[def.name] = "none";
        }
      }

      return provenance;
    },
  );
