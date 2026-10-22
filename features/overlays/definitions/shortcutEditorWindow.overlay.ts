"use client";

/**
 * Opener for the `shortcutEditorWindow` overlay — THE shortcut editor in a
 * window. `shortcutEditorWindowAction()` is the plain action for non-React
 * callers (the rich-document action handlers); `useOpenShortcutEditorWindow()`
 * is the hook.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { createOpener } from "@ai-matrx/summon/opener";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "shortcutEditorWindow" as const;
const opener = createOpener<object>(OVERLAY_ID, { multi: true });

export interface OpenShortcutEditorWindowArgs {
  agentId: string;
  /** "new" (the default) or an existing shortcut id. */
  shortcutId?: string;
  /** A draft seed id from `putShortcutDraftSeed` (new drafts only). */
  seedId?: string | null;
}

export function shortcutEditorWindowAction(args: OpenShortcutEditorWindowArgs) {
  return opener.openAction({
    agentId: args.agentId,
    shortcutId: args.shortcutId ?? "new",
    seedId: args.seedId ?? null,
  });
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createShortcutEditorWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (args: OpenShortcutEditorWindowArgs) => {
    dispatch(shortcutEditorWindowAction(args));
  };
}

export function useOpenShortcutEditorWindow() {
  const store = useAppStore();
  return useMemo(() => createShortcutEditorWindowOpener(store), [store]);
}

export type ShortcutEditorWindowDefinitionData = OpenShortcutEditorWindowArgs;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shortcutEditorWindow: OverlayWire<ShortcutEditorWindowDefinitionData>;
  }
}
