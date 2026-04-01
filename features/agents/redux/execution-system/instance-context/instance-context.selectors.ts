import type { RootState } from "@/lib/redux/store";
import type { InstanceContextEntry } from "@/features/agents/types";

export const selectInstanceContextEntries =
  (instanceId: string) =>
  (state: RootState): InstanceContextEntry[] => {
    const context = state.instanceContext.byInstanceId[instanceId];
    if (!context) return [];
    return Object.values(context);
  };

export const selectInstanceContextEntry =
  (instanceId: string, key: string) =>
  (state: RootState): InstanceContextEntry | undefined =>
    state.instanceContext.byInstanceId[instanceId]?.[key];

/**
 * Context entries that match agent-defined slots.
 */
export const selectSlotMatchedContext =
  (instanceId: string) =>
  (state: RootState): InstanceContextEntry[] => {
    const context = state.instanceContext.byInstanceId[instanceId];
    if (!context) return [];
    return Object.values(context).filter((e) => e.slotMatched);
  };

/**
 * Ad-hoc context entries (not matching any slot).
 */
export const selectAdHocContext =
  (instanceId: string) =>
  (state: RootState): InstanceContextEntry[] => {
    const context = state.instanceContext.byInstanceId[instanceId];
    if (!context) return [];
    return Object.values(context).filter((e) => !e.slotMatched);
  };

/**
 * Build the context dict for the API payload.
 * Returns Record<string, ContextValue> ready for the request.
 */
export const selectContextPayload =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> | undefined => {
    const context = state.instanceContext.byInstanceId[instanceId];
    if (!context) return undefined;

    const entries = Object.values(context);
    if (entries.length === 0) return undefined;

    const payload: Record<string, unknown> = {};
    for (const entry of entries) {
      payload[entry.key] = entry.value;
    }
    return payload;
  };
