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
  VariableInputStyle,
} from "@/features/agents/types";
import { DEFAULT_BUILDER_ADVANCED_SETTINGS } from "@/features/agents/types/instance.types";

// ── Full state accessor ──────────────────────────────────────────────────────

export const selectInstanceUIState =
  (conversationId: string) =>
  (state: RootState): InstanceUIState | undefined =>
    state.instanceUIState.byConversationId[conversationId];

// ── Display mode ─────────────────────────────────────────────────────────────

export const selectDisplayMode =
  (conversationId: string) =>
  (state: RootState): ResultDisplayMode | undefined =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode;

export const selectIsModalFull =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode ===
    "modal-full";

export const selectIsModalCompact =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode ===
    "modal-compact";

export const selectIsChatBubble =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode ===
    "chat-bubble";

export const selectIsInline =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode ===
    "inline";

export const selectIsPanel =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode ===
    "panel";

export const selectIsToast =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.displayMode ===
    "toast";

export const selectIsAnyModal =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const mode =
      state.instanceUIState.byConversationId[conversationId]?.displayMode;
    return mode === "modal-full" || mode === "modal-compact";
  };

// ── Execution behavior ───────────────────────────────────────────────────────

export const selectAutoRun =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.autoRun ?? true;

export const selectAllowChat =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.allowChat ?? true;

// ── Pre-execution gate ───────────────────────────────────────────────────────

export const selectUsePreExecutionInput =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.usePreExecutionInput ?? false;

export const selectPreExecutionSatisfied =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.preExecutionSatisfied ?? false;

/**
 * Derived: Does this instance need pre-execution input that hasn't been provided yet?
 * Components use this to gate between <AgentPreExecutionInput /> and main content.
 */
export const selectNeedsPreExecutionInput =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUIState.byConversationId[conversationId];
    if (!entry) return false;
    return entry.usePreExecutionInput && !entry.preExecutionSatisfied;
  };

// ── Visibility (fine-grained) ────────────────────────────────────────────────

export const selectShowVariablePanel =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.showVariablePanel ??
    false;

export const selectShowDefinitionMessages =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.showDefinitionMessages ?? true;

export const selectShowDefinitionMessageContent =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.showDefinitionMessageContent ?? false;

export const selectHiddenMessageCount =
  (conversationId: string) =>
  (state: RootState): number =>
    state.instanceUIState.byConversationId[conversationId]
      ?.hiddenMessageCount ?? 0;

// ── Callback integration ─────────────────────────────────────────────────────

export const selectCallbackGroupId =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byConversationId[conversationId]?.callbackGroupId ??
    null;

// ── Derived: should input be visible ─────────────────────────────────────────

/**
 * Derived selector: should the text input component be visible?
 * True when:
 *   - allowChat is true (user can continue chatting), OR
 *   - autoRun is false and instance is still in draft/ready (user needs to trigger execution)
 */
export const selectShouldShowInput =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUIState.byConversationId[conversationId];
    if (!entry) return false;
    if (entry.allowChat) return true;
    if (!entry.autoRun) {
      const instance =
        state.executionInstances.byConversationId[conversationId];
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
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const inst = state.executionInstances.byConversationId[conversationId];
    console.log(
      "[selectInstanceAgentId] conversationId:",
      conversationId,
      "| instance exists:",
      !!inst,
      "| agentId:",
      inst?.agentId,
      "| all conversationIds:",
      Object.keys(state.executionInstances.byConversationId).slice(0, 3),
    );
    return inst?.agentId || undefined;
  };

export const selectInstanceShortcutId =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.executionInstances.byConversationId[conversationId]?.shortcutId ??
    null;

export const selectInstanceOrigin =
  (conversationId: string) =>
  (state: RootState): string | undefined =>
    state.executionInstances.byConversationId[conversationId]?.origin;

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
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const shortcutId =
      state.executionInstances.byConversationId[conversationId]?.shortcutId;
    if (!shortcutId) return undefined;
    return state.agentShortcut?.[shortcutId]?.label || undefined;
  };

/**
 * Tier 1 — Agent name only.
 * Returns the agent's name from the definition slice, or undefined.
 * Use when you specifically want the agent name, not a shortcut or conversation label.
 */
export const selectInstanceAgentName =
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const agentId =
      state.executionInstances.byConversationId[conversationId]?.agentId;
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
  (conversationId: string) =>
  (state: RootState): string | null | undefined => {
    const agentId =
      state.executionInstances.byConversationId[conversationId]?.agentId;
    if (!agentId) return undefined;
    return state.agentDefinition.agents?.[agentId]?.description;
  };

/**
 * Tier 2 — Static title: shortcut label → agent name → undefined.
 * Use when you want the best static label but don't need conversation context.
 */
export const selectInstanceTitle =
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const instance = state.executionInstances.byConversationId[conversationId];
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
  (conversationId: string) =>
  (state: RootState): string => {
    const conversationTitle =
      state.instanceConversationHistory.byConversationId[conversationId]?.title;
    if (conversationTitle) return conversationTitle;

    const instance = state.executionInstances.byConversationId[conversationId];
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
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.submitOnEnter ??
    true;

export const selectIsCreator =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.isCreator ?? false;

export const selectShowCreatorDebug =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.showCreatorDebug ??
    false;

export const selectExpandedVariableId =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byConversationId[conversationId]
      ?.expandedVariableId ?? null;

export const selectAutoClearConversation =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.autoClearConversation ?? false;

export const selectIsExpanded =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.isExpanded ?? true;

export const selectModeState =
  (conversationId: string) =>
  (state: RootState): Record<string, unknown> | undefined =>
    state.instanceUIState.byConversationId[conversationId]?.modeState;

export const selectReuseConversationId =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.reuseConversationId ?? false;

export const selectBuilderAdvancedSettings =
  (conversationId: string) =>
  (state: RootState): BuilderAdvancedSettings | undefined =>
    state.instanceUIState.byConversationId[conversationId]
      ?.builderAdvancedSettings;

export const selectBuilderDebug =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.builderAdvancedSettings?.debug ?? false;

export const selectBuilderStore =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.builderAdvancedSettings?.store ?? false;

export const selectUseStructuredSystemInstruction =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]
      ?.builderAdvancedSettings?.useStructuredSystemInstruction ?? false;

export const selectStructuredInstruction =
  (conversationId: string) => (state: RootState) =>
    state.instanceUIState.byConversationId[conversationId]
      ?.builderAdvancedSettings?.structuredInstruction;

// ── Content visibility selectors ──────────────────────────────────────────────

export const selectHideReasoning =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.hideReasoning ??
    false;

export const selectHideToolResults =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byConversationId[conversationId]?.hideToolResults ??
    false;

export const selectPreExecutionMessage =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byConversationId[conversationId]
      ?.preExecutionMessage ?? null;

export const selectVariableInputStyle =
  (conversationId: string) =>
  (state: RootState): VariableInputStyle =>
    state.instanceUIState.byConversationId[conversationId]
      ?.variableInputStyle ?? "inline";

// ── Global preference selectors ───────────────────────────────────────────────

export const selectUseBlockMode = (state: RootState): boolean =>
  state.instanceUIState.useBlockMode;

// ── Global registry selectors (keyed by display mode) ────────────────────────

export const selectInstanceIdsByMode = (mode: ResultDisplayMode) =>
  createSelector(
    (state: RootState) => state.instanceUIState.byConversationId,
    (byConversationId): string[] | undefined => {
      const ids = Object.keys(byConversationId).filter(
        (id) => byConversationId[id]?.displayMode === mode,
      );
      return ids.length > 0 ? ids : undefined;
    },
  );

export const selectModalInstanceIds = createSelector(
  (state: RootState) => state.instanceUIState.byConversationId,
  (byConversationId): string[] | undefined => {
    const ids = Object.keys(byConversationId).filter((id) => {
      const mode = byConversationId[id]?.displayMode;
      return mode === "modal-full" || mode === "modal-compact";
    });
    return ids.length > 0 ? ids : undefined;
  },
);

export const selectPersistentInstanceIds = createSelector(
  (state: RootState) => state.instanceUIState.byConversationId,
  (byConversationId): string[] | undefined => {
    const ids = Object.keys(byConversationId).filter((id) => {
      const mode = byConversationId[id]?.displayMode;
      return mode === "panel" || mode === "chat-bubble";
    });
    return ids.length > 0 ? ids : undefined;
  },
);
