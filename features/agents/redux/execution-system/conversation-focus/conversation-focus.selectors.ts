import type { RootState } from "@/lib/redux/store";

/**
 * Returns the "input" conversation id for a surface — the one bound to the
 * smart input / variables panel. In the default (non-split) case this is also
 * the id bound to the display; callers that don't care about the split can
 * keep using this selector as the single source of truth.
 */
export const selectFocusedConversation =
  (surfaceKey: string) =>
  (state: RootState): string | null =>
    state.conversationFocus?.bySurface[surfaceKey]?.input ?? null;

export const selectInputConversation = selectFocusedConversation;

/**
 * Returns the "display" conversation id — what the conversation column /
 * history panel is bound to. Under autoclear split, this is the
 * currently-streaming conversation, which lags one step behind `input`.
 */
export const selectDisplayConversation =
  (surfaceKey: string) =>
  (state: RootState): string | null =>
    state.conversationFocus?.bySurface[surfaceKey]?.display ?? null;

/**
 * Returns true when display and input point at different conversations
 * (i.e. the autoclear split is currently active).
 */
export const selectIsFocusSplit =
  (surfaceKey: string) =>
  (state: RootState): boolean => {
    const entry = state.conversationFocus?.bySurface[surfaceKey];
    if (!entry) return false;
    return entry.display !== entry.input;
  };

export const selectAllSurfaceFocus = (state: RootState) =>
  state.conversationFocus?.bySurface;
