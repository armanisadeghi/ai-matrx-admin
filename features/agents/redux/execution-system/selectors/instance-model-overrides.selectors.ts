import type { RootState } from "@/lib/redux/store";
import type {
  InstanceModelOverrideState,
  LLMParams,
} from "@/features/agents/types";

/**
 * Raw override state for an instance.
 */
export const selectInstanceOverrideState =
  (instanceId: string) =>
  (state: RootState): InstanceModelOverrideState | undefined =>
    state.instanceModelOverrides.byInstanceId[instanceId];

/**
 * SELECTOR: "All Current Settings" — for the UI.
 *
 * Merges agent defaults + instance overrides, then strips removals.
 * This is what the settings UI displays as "current values."
 */
export const selectCurrentSettings =
  (instanceId: string, agentId: string) =>
  (state: RootState): LLMParams => {
    const base = state.agentModelConfig.byId[agentId]?.modelOverrides ?? {};
    const overrideState = state.instanceModelOverrides.byInstanceId[instanceId];

    if (!overrideState) return { ...base };

    // Start with defaults
    const merged: Record<string, unknown> = { ...base };

    // Apply overrides
    for (const [key, value] of Object.entries(overrideState.overrides)) {
      merged[key] = value;
    }

    // Strip removals
    for (const key of overrideState.removals) {
      delete merged[key];
    }

    return merged as LLMParams;
  };

/**
 * SELECTOR: "Overrides Only" — for the API payload.
 *
 * Returns ONLY the keys that differ from the agent's defaults.
 * This is what gets sent as config_overrides in the request.
 *
 * CRITICAL: Sending a default value as an override causes an API error.
 * This selector guarantees only true deltas are included.
 */
export const selectSettingsOverridesForApi =
  (instanceId: string, agentId: string) =>
  (state: RootState): Record<string, unknown> | undefined => {
    const overrideState = state.instanceModelOverrides.byInstanceId[instanceId];

    if (!overrideState) return undefined;

    const hasOverrides = Object.keys(overrideState.overrides).length > 0;
    const hasRemovals = overrideState.removals.length > 0;

    if (!hasOverrides && !hasRemovals) return undefined;

    const result: Record<string, unknown> = {};

    // Include changed values
    for (const [key, value] of Object.entries(overrideState.overrides)) {
      result[key] = value;
    }

    // Include removals as explicit nulls (API contract: null = "remove this setting")
    for (const key of overrideState.removals) {
      result[key] = null;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  };

/**
 * Check if an instance has any overrides at all.
 */
export const selectHasOverrides =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceModelOverrides.byInstanceId[instanceId];
    if (!entry) return false;
    return Object.keys(entry.overrides).length > 0 || entry.removals.length > 0;
  };

/**
 * Get the list of keys that have been explicitly changed or removed.
 * Useful for UI indicators showing "this setting is overridden."
 */
export const selectOverriddenKeys =
  (instanceId: string) =>
  (state: RootState): { changed: string[]; removed: string[] } => {
    const entry = state.instanceModelOverrides.byInstanceId[instanceId];
    if (!entry) return { changed: [], removed: [] };
    return {
      changed: Object.keys(entry.overrides),
      removed: [...entry.removals],
    };
  };
