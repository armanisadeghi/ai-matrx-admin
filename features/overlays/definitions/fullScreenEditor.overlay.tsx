"use client";

/**
 * Opener for the `fullScreenEditor` overlay.
 *
 * - `useOpenFullScreenMarkdownEditorBridge()` — imperative hook. Call to open
 *   with typed options; returns a handle with a `close()` method.
 * - `<FullScreenMarkdownEditorBridgeController />` — declarative wrapper. Mount
 *   to open, unmount to close.
 *
 * CALLBACK-AWARE (2026-06-14). `onSave` is delivered through the global
 * `callbackManager` — the opener registers a callback GROUP and passes only the
 * serialisable `callbackGroupId` string through Redux. Functions NEVER travel
 * through `openOverlay` data (overlay hard rule #5). This replaced the dead
 * `onSave={undefined}` stub in OverlayWorldHost that silently broke every
 * editor save. See `features/overlays/callbacks/fullScreenEditor.ts`.
 *
 * Two save paths, mutually exclusive (the bridge prefers the callback):
 *   - Pass `onSave` → the bridge emits to your callback (you own persistence /
 *     post-save flow, e.g. the fork-vs-overwrite dialog for "Edit & resubmit").
 *   - Pass `conversationId` + `messageId` and NO `onSave` → the bridge
 *     self-handles via `editMessage` (plain "Edit content").
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { openOverlay, mintInstanceId } from "@ai-matrx/summon/open";
import {
  createFullScreenEditorCallbackGroup,
  disposeFullScreenEditorCallbackGroup,
  type FullScreenEditorHandlers,
} from "./callbacks/fullScreenEditor";
import type { EditorPrimaryAction } from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "fullScreenEditor" as const;
const opener = createOpener<object>(OVERLAY_ID);

interface OpenFullScreenMarkdownEditorBridgeOptionsBase {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  content?: string;
  /** TODO: tighten to `FullScreenEditorMode` once that type is imported. */
  mode?: unknown;
  conversationId?: string;
  messageId?: string;
  /** TODO: tighten to `TabId[]` once that type is imported. */
  tabs?: unknown;
  /** TODO: tighten to `TabId` once that type is imported. */
  initialTab?: unknown;
  analysisData?: Record<string, unknown>;
  title?: string;
  description?: string;
  showSaveButton?: boolean;
  showCopyButton?: boolean;
  /**
   * Footer action buttons. When provided, they REPLACE the single default Save
   * button — each renders as its own footer button and, on click, fires the
   * caller's `onAction(actionId, content)` (a save event carrying `action`).
   * This is how one editor offers Save / Save & Resubmit / Create Fork with no
   * follow-up confirmation dialog. Metadata-only (id/label/variant) so it
   * travels safely through the overlay data payload; the handler rides the
   * callback group.
   */
  primaryActions?: EditorPrimaryAction[];
}

export type OpenFullScreenMarkdownEditorBridgeOptions =
  | (OpenFullScreenMarkdownEditorBridgeOptionsBase & FullScreenEditorHandlers)
  | (OpenFullScreenMarkdownEditorBridgeOptionsBase & {
      onSave?: undefined;
      onAction?: undefined;
      onEvent?: undefined;
    });

export interface FullScreenMarkdownEditorBridgeHandle {
  instanceId: string;
  callbackGroupId: string | null;
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createFullScreenMarkdownEditorBridgeOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (
    opts: OpenFullScreenMarkdownEditorBridgeOptions = {},
  ): FullScreenMarkdownEditorBridgeHandle => {
    const instanceId =
      opts.instanceId ??
      mintInstanceId(OVERLAY_ID);

    // Register a callback group only when the caller wants to be told about
    // the save. Plain "edit content" callers pass conversationId+messageId
    // and let the bridge self-handle — no group needed.
    let callbackGroupId: string | null = null;
    if (opts.onSave) {
      const group = createFullScreenEditorCallbackGroup({
        onSave: opts.onSave,
        onEvent: opts.onEvent,
      });
      callbackGroupId = group.callbackGroupId;
    } else if (opts.onAction) {
      const group = createFullScreenEditorCallbackGroup({
        onAction: opts.onAction,
        onEvent: opts.onEvent,
      });
      callbackGroupId = group.callbackGroupId;
    }

    try {
      opener.open(dispatch, { instanceId, data: {
            content: opts.content,
            mode: opts.mode,
            conversationId: opts.conversationId,
            messageId: opts.messageId,
            callbackGroupId,
            tabs: opts.tabs,
            initialTab: opts.initialTab,
            analysisData: opts.analysisData,
            title: opts.title,
            description: opts.description,
            showSaveButton: opts.showSaveButton,
            showCopyButton: opts.showCopyButton,
            primaryActions: opts.primaryActions,
          } });
    } catch (error) {
      disposeFullScreenEditorCallbackGroup(callbackGroupId);
      throw error;
    }

    return {
      instanceId,
      callbackGroupId,
      close: () => {
        dispatch(opener.close(instanceId));
        disposeFullScreenEditorCallbackGroup(callbackGroupId);
      },
    };
  };
}

export function useOpenFullScreenMarkdownEditorBridge() {
  const store = useAppStore();
  return useMemo(() => createFullScreenMarkdownEditorBridgeOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const FullScreenMarkdownEditorBridgeController = hookController<OpenFullScreenMarkdownEditorBridgeOptions>(useOpenFullScreenMarkdownEditorBridge);

/** Which message a full-screen edit belongs to (moved from the app's summon overlay state). */
export type FullScreenEditorMode =
  | "assistant-message"
  | "user-message"
  | "free";

export type FullScreenEditorDefinitionData = OpenFullScreenMarkdownEditorBridgeOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    fullScreenEditor: OverlayWire<FullScreenEditorDefinitionData>;
  }
}
