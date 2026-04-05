import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { InstanceContextEntry } from "@/features/agents/types";

const EMPTY_CONTEXT_ENTRIES: InstanceContextEntry[] = [];

export const selectInstanceContextEntries = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceContext.byInstanceId[instanceId],
    (context): InstanceContextEntry[] => {
      if (!context) return EMPTY_CONTEXT_ENTRIES;
      const values = Object.values(context);
      return values.length === 0 ? EMPTY_CONTEXT_ENTRIES : values;
    },
  );

export const selectInstanceContextEntry =
  (instanceId: string, key: string) =>
  (state: RootState): InstanceContextEntry | undefined =>
    state.instanceContext.byInstanceId[instanceId]?.[key];

/**
 * Context entries that match agent-defined slots.
 */
export const selectSlotMatchedContext = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceContext.byInstanceId[instanceId],
    (context): InstanceContextEntry[] => {
      if (!context) return EMPTY_CONTEXT_ENTRIES;
      const filtered = Object.values(context).filter((e) => e.slotMatched);
      return filtered.length === 0 ? EMPTY_CONTEXT_ENTRIES : filtered;
    },
  );

/**
 * Ad-hoc context entries (not matching any slot).
 */
export const selectAdHocContext = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceContext.byInstanceId[instanceId],
    (context): InstanceContextEntry[] => {
      if (!context) return EMPTY_CONTEXT_ENTRIES;
      const filtered = Object.values(context).filter((e) => !e.slotMatched);
      return filtered.length === 0 ? EMPTY_CONTEXT_ENTRIES : filtered;
    },
  );

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
