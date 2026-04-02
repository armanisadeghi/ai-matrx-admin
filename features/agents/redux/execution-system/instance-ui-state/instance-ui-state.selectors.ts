/**
 * Instance UI State Selectors
 *
 * SELECTOR RULES enforced here:
 * - Primitives returned directly (string, boolean, null) — stable by value.
 * - No ?? [] / ?? {} defaults — return undefined, guard in component.
 * - ?? for primitives is fine (boolean/string/null are value-compared).
 * - Objects from state returned by reference — safe as long as we don't
 *   construct new objects inside the selector body.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  InstanceUIState,
  ResultDisplayMode,
} from "@/features/agents/types";

/**
 * Full UI state for an instance.
 * Returns the existing state object by reference — no new object created.
 * Returns undefined when the instance hasn't been initialized yet.
 */
export const selectInstanceUIState =
  (instanceId: string) =>
  (state: RootState): InstanceUIState | undefined =>
    state.instanceUIState.byInstanceId[instanceId];

/**
 * Current display mode.
 * Primitive — safe to use directly.
 * Returns undefined when instance not found (guard in component).
 */
export const selectDisplayMode =
  (instanceId: string) =>
  (state: RootState): ResultDisplayMode | undefined =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode;

// ── Display mode boolean helpers ─────────────────────────────────────────────
// One selector per mode — each returns a stable boolean primitive.
// Components use these to conditionally render layout variants.

export const selectIsModalFull =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode ===
    "modal-full";

export const selectIsModalCompact =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode ===
    "modal-compact";

export const selectIsChatBubble =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode ===
    "chat-bubble";

export const selectIsInline =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode === "inline";

export const selectIsPanel =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode === "panel";

export const selectIsToast =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode === "toast";

/** Is the instance displayed in any modal variant (full or compact)? */
export const selectIsAnyModal =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const mode = state.instanceUIState.byInstanceId[instanceId]?.displayMode;
    return mode === "modal-full" || mode === "modal-compact";
  };

// ── Other primitives ─────────────────────────────────────────────────────────

export const selectAllowChat =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.allowChat ?? true;

export const selectShowVariablePanel =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.showVariablePanel ?? false;

export const selectSubmitOnEnter =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.submitOnEnter ?? true;

export const selectIsCreator =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.isCreator ?? false;

export const selectShowCreatorDebug =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.showCreatorDebug ?? false;

export const selectExpandedVariableId =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byInstanceId[instanceId]?.expandedVariableId ?? null;

export const selectAutoClearConversation =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.autoClearConversation ??
    false;

export const selectIsExpanded =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.isExpanded ?? true;

/**
 * Mode-specific state for a given instance.
 * Returns the existing object by reference — no new object constructed.
 * Returns undefined when instance not initialized.
 */
export const selectModeState =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> | undefined =>
    state.instanceUIState.byInstanceId[instanceId]?.modeState;

// ── Global preference selectors ───────────────────────────────────────────────

/**
 * Whether the chat route is in block mode (admin/pilot feature).
 * Global display preference — not tied to any specific instance.
 * Read at execute time like apiBaseUrl.
 */
export const selectUseBlockMode = (state: RootState): boolean =>
  state.instanceUIState.useBlockMode;

// ── Global registry selectors (keyed by display mode) ────────────────────────
// These are memoized because they build arrays from the full map.
// Each returns a stable array — only recomputes when the map changes.

/**
 * All instanceIds that are currently set to a given display mode.
 *
 * Usage:
 *   const modalIds = useAppSelector(selectInstanceIdsByMode("modal-full"));
 *
 * Memoized — stable array reference when nothing changes.
 * Returns undefined (not []) when no instances exist at all.
 */
export const selectInstanceIdsByMode = (mode: ResultDisplayMode) =>
  createSelector(
    (state: RootState) => state.instanceUIState.byInstanceId,
    (byInstanceId): string[] | undefined => {
      const ids = Object.keys(byInstanceId).filter(
        (id) => byInstanceId[id]?.displayMode === mode,
      );
      return ids.length > 0 ? ids : undefined;
    },
  );

/**
 * All instanceIds that are in any modal variant (modal-full or modal-compact).
 * Memoized — stable array reference when nothing changes.
 */
export const selectModalInstanceIds = createSelector(
  (state: RootState) => state.instanceUIState.byInstanceId,
  (byInstanceId): string[] | undefined => {
    const ids = Object.keys(byInstanceId).filter((id) => {
      const mode = byInstanceId[id]?.displayMode;
      return mode === "modal-full" || mode === "modal-compact";
    });
    return ids.length > 0 ? ids : undefined;
  },
);

/**
 * All instanceIds that are in panel or chat-bubble mode.
 * Used to render persistent side panels without mounting/unmounting.
 */
export const selectPersistentInstanceIds = createSelector(
  (state: RootState) => state.instanceUIState.byInstanceId,
  (byInstanceId): string[] | undefined => {
    const ids = Object.keys(byInstanceId).filter((id) => {
      const mode = byInstanceId[id]?.displayMode;
      return mode === "panel" || mode === "chat-bubble";
    });
    return ids.length > 0 ? ids : undefined;
  },
);
