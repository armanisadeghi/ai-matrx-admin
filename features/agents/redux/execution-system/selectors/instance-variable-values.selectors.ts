import type { RootState } from "@/lib/redux/store";

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
 * SELECTOR: Fully resolved variables — the three-tier merge.
 *
 * Priority: user-provided > scope-resolved > definition defaults
 *
 * Returns a complete Record with a value for every defined variable
 * (or null if no source provides one).
 *
 * This is what the execution thunk reads when building the API payload.
 */
export const selectResolvedVariables =
  (instanceId: string, agentId: string) =>
  (state: RootState): Record<string, unknown> => {
    // Get variable definitions for this agent
    const definitions =
      state.agentDefinition[agentId]?.variableDefinitions ?? [];

    // Get instance values
    const entry = state.instanceVariableValues.byInstanceId[instanceId];
    const userValues = entry?.userValues ?? {};
    const scopeValues = entry?.scopeValues ?? {};

    const resolved: Record<string, unknown> = {};

    for (const def of definitions) {
      if (def.name in userValues) {
        // Tier 1: user-provided
        resolved[def.name] = userValues[def.name];
      } else if (def.name in scopeValues) {
        // Tier 2: scope-resolved
        resolved[def.name] = scopeValues[def.name];
      } else if (def.defaultValue !== undefined && def.defaultValue !== null) {
        // Tier 3: definition default
        resolved[def.name] = def.defaultValue;
      } else {
        // No value available
        resolved[def.name] = null;
      }
    }

    return resolved;
  };

/**
 * SELECTOR: Variables that are required but have no value.
 * Used by the UI to show validation errors before execution.
 */
export const selectMissingRequiredVariables =
  (instanceId: string, agentId: string) =>
  (state: RootState): string[] => {
    const definitions =
      state.agentDefinition[agentId]?.variableDefinitions ?? [];
    const resolved = selectResolvedVariables(instanceId, agentId)(state);

    return definitions
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
 * SELECTOR: For each variable, where did its value come from?
 * Useful for the UI to show provenance indicators.
 */
export const selectVariableProvenance =
  (instanceId: string, agentId: string) =>
  (state: RootState): Record<string, "user" | "scope" | "default" | "none"> => {
    const definitions = state.agentDefinition[agentId]?.variableDefinitions;
    const entry = state.instanceVariableValues.byInstanceId[instanceId];
    const userValues = entry?.userValues ?? {};
    const scopeValues = entry?.scopeValues ?? {};

    const provenance: Record<string, "user" | "scope" | "default" | "none"> =
      {};

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
