import type { RootState } from "@/lib/redux/store";

export const selectFocusedConversation =
  (surfaceKey: string) =>
  (state: RootState): string | null =>
    state.conversationFocus?.bySurface[surfaceKey] ?? null;

export const selectAllSurfaceFocus = (state: RootState) =>
  state.conversationFocus?.bySurface;
