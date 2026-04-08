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
  BuilderAdvancedSettings,
  InstanceUIState,
  ResultDisplayMode,
} from "@/features/agents/types";
import { DEFAULT_BUILDER_ADVANCED_SETTINGS } from "@/features/agents/types/instance.types";

// ── Full state accessor ──────────────────────────────────────────────────────

export const selectInstanceUIState =
  (instanceId: string) =>
  (state: RootState): InstanceUIState | undefined =>
    state.instanceUIState.byInstanceId[instanceId];

// ── Display mode ─────────────────────────────────────────────────────────────

export const selectDisplayMode =
  (instanceId: string) =>
  (state: RootState): ResultDisplayMode | undefined =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode;

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

export const selectIsAnyModal =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const mode = state.instanceUIState.byInstanceId[instanceId]?.displayMode;
    return mode === "modal-full" || mode === "modal-compact";
  };

// ── Execution behavior ───────────────────────────────────────────────────────

export const selectAutoRun =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.autoRun ?? true;

export const selectAllowChat =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.allowChat ?? true;

// ── Pre-execution gate ───────────────────────────────────────────────────────

export const selectUsePreExecutionInput =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.usePreExecutionInput ??
    false;

export const selectPreExecutionSatisfied =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.preExecutionSatisfied ??
    false;

/**
 * Derived: Does this instance need pre-execution input that hasn't been provided yet?
 * Components use this to gate between <AgentPreExecutionInput /> and main content.
 */
export const selectNeedsPreExecutionInput =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUIState.byInstanceId[instanceId];
    if (!entry) return false;
    return entry.usePreExecutionInput && !entry.preExecutionSatisfied;
  };

// ── Visibility (fine-grained) ────────────────────────────────────────────────

export const selectShowVariablePanel =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.showVariablePanel ?? false;

export const selectShowDefinitionMessages =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.showDefinitionMessages ??
    true;

export const selectShowDefinitionMessageContent =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]
      ?.showDefinitionMessageContent ?? false;

export const selectHiddenMessageCount =
  (instanceId: string) =>
  (state: RootState): number =>
    state.instanceUIState.byInstanceId[instanceId]?.hiddenMessageCount ?? 0;

// ── Callback integration ─────────────────────────────────────────────────────

export const selectCallbackGroupId =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byInstanceId[instanceId]?.callbackGroupId ?? null;

// ── Derived: should input be visible ─────────────────────────────────────────

/**
 * Derived selector: should the text input component be visible?
 * True when:
 *   - allowChat is true (user can continue chatting), OR
 *   - autoRun is false and instance is still in draft/ready (user needs to trigger execution)
 */
export const selectShouldShowInput =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUIState.byInstanceId[instanceId];
    if (!entry) return false;
    if (entry.allowChat) return true;
    if (!entry.autoRun) {
      const instance = state.executionInstances.byInstanceId[instanceId];
      if (
        instance &&
        (instance.status === "draft" || instance.status === "ready")
      ) {
        return true;
      }
    }
    return false;
  };

// ── Instance identity (simple primitive lookups) ─────────────────────────────

export const selectInstanceAgentId =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const inst = state.executionInstances.byInstanceId[instanceId];
    console.log(
      "[selectInstanceAgentId] instanceId:",
      instanceId,
      "| instance exists:",
      !!inst,
      "| agentId:",
      inst?.agentId,
      "| all instanceIds:",
      Object.keys(state.executionInstances.byInstanceId).slice(0, 3),
    );
    return inst?.agentId || undefined;
  };

export const selectInstanceShortcutId =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.executionInstances.byInstanceId[instanceId]?.shortcutId ?? null;

export const selectInstanceOrigin =
  (instanceId: string) =>
  (state: RootState): string | undefined =>
    state.executionInstances.byInstanceId[instanceId]?.origin;

// ── Instance title selectors (three tiers) ───────────────────────────────────
//
// Three selectors with increasing priority, each returning a guaranteed string.
// All reads are primitives — no new objects, no ?? [] traps, safe for bare
// useAppSelector.
//
// Tier 1 — agent name only:       selectInstanceAgentName (string | undefined)
// Tier 2 — shortcut label first:  selectInstanceTitle     (string | undefined)
// Tier 3 — conversation override: selectInstanceDisplayTitle (always string)
//
// Use the lowest tier that satisfies your use case. Pre-execution UI that
// specifically shows the agent name should use Tier 1. Any chrome that shows
// the best available label should use Tier 2 or 3.

/** Shortcut label — only available when the instance was created from a shortcut. */
export const selectInstanceShortcutLabel =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const shortcutId =
      state.executionInstances.byInstanceId[instanceId]?.shortcutId;
    if (!shortcutId) return undefined;
    return state.agentShortcut?.[shortcutId]?.label || undefined;
  };

/**
 * Tier 1 — Agent name only.
 * Returns the agent's name from the definition slice, or undefined.
 * Use when you specifically want the agent name, not a shortcut or conversation label.
 */
export const selectInstanceAgentName =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const agentId = state.executionInstances.byInstanceId[instanceId]?.agentId;
    if (!agentId) return undefined;
    return state.agentDefinition.agents?.[agentId]?.name || undefined;
  };

/**
 * Tier 1 — Agent description only.
 * Raw read from the definition slice — no ?? / defaults (redux-selector-rules).
 * undefined: missing instance/agent id or agent record not in map yet.
 * null: record exists with description explicitly null.
 */
export const selectInstanceAgentDescription =
  (instanceId: string) =>
  (state: RootState): string | null | undefined => {
    const agentId = state.executionInstances.byInstanceId[instanceId]?.agentId;
    if (!agentId) return undefined;
    return state.agentDefinition.agents?.[agentId]?.description;
  };

/**
 * Tier 2 — Static title: shortcut label → agent name → undefined.
 * Use when you want the best static label but don't need conversation context.
 */
export const selectInstanceTitle =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const instance = state.executionInstances.byInstanceId[instanceId];
    if (!instance) return undefined;

    if (instance.shortcutId) {
      const label = state.agentShortcut?.[instance.shortcutId]?.label;
      if (label) return label;
    }

    if (instance.agentId) {
      const name = state.agentDefinition.agents?.[instance.agentId]?.name;
      if (name) return name;
    }

    return undefined;
  };

/**
 * Tier 3 — Full display title: conversationTitle → shortcutLabel → agentName → "Agent".
 *
 * Always returns a string — the "Agent" fallback is inlined so the component
 * never needs a null guard or ?? fallback. Use for any title bar or header
 * that should show the best available label at all times.
 */
export const selectInstanceDisplayTitle =
  (instanceId: string) =>
  (state: RootState): string => {
    const conversationTitle =
      state.instanceConversationHistory.byInstanceId[instanceId]?.title;
    if (conversationTitle) return conversationTitle;

    const instance = state.executionInstances.byInstanceId[instanceId];
    if (!instance) return "Agent";

    if (instance.shortcutId) {
      const label = state.agentShortcut?.[instance.shortcutId]?.label;
      if (label) return label;
    }

    if (instance.agentId) {
      const name = state.agentDefinition.agents?.[instance.agentId]?.name;
      if (name) return name;
    }

    return "Agent";
  };

// ── Layout & interaction (existing) ──────────────────────────────────────────

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

export const selectModeState =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> | undefined =>
    state.instanceUIState.byInstanceId[instanceId]?.modeState;

export const selectReuseConversationId =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.reuseConversationId ??
    false;

export const selectBuilderAdvancedSettings =
  (instanceId: string) =>
  (state: RootState): BuilderAdvancedSettings | undefined =>
    state.instanceUIState.byInstanceId[instanceId]?.builderAdvancedSettings;

export const selectBuilderDebug =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.builderAdvancedSettings
      ?.debug ?? false;

export const selectBuilderStore =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.builderAdvancedSettings
      ?.store ?? false;

export const selectUseStructuredSystemInstruction =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.builderAdvancedSettings
      ?.useStructuredSystemInstruction ?? false;

export const selectStructuredInstruction =
  (instanceId: string) => (state: RootState) =>
    state.instanceUIState.byInstanceId[instanceId]?.builderAdvancedSettings
      ?.structuredInstruction;

// ── Content visibility selectors ──────────────────────────────────────────────

export const selectHideReasoning =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.hideReasoning ?? false;

export const selectHideToolResults =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.hideToolResults ?? false;

export const selectPreExecutionMessage =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byInstanceId[instanceId]?.preExecutionMessage ?? null;

export const selectVariableInputStyle =
  (instanceId: string) =>
  (state: RootState): "inline" | "wizard" =>
    state.instanceUIState.byInstanceId[instanceId]?.variableInputStyle ??
    "inline";

// ── Global preference selectors ───────────────────────────────────────────────

export const selectUseBlockMode = (state: RootState): boolean =>
  state.instanceUIState.useBlockMode;

// ── Global registry selectors (keyed by display mode) ────────────────────────

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
