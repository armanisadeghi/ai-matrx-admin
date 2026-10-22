"use client";

/**
 * Opener for the `htmlPreview` overlay.
 *
 * - `useOpenHtmlPreviewBridge()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<HtmlPreviewBridgeController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Callback-aware (D33): `onSave` never travels through Redux. The opener
 * registers a callback GROUP via `createFullScreenEditorCallbackGroup` (the
 * same channel the full-screen editor uses) and passes only the serialisable
 * `callbackGroupId` string through `openOverlay` data. `HtmlPreviewBridge`
 * emits the save on that group; the handler fires in the caller's context.
 * With no `onSave`, chat-message callers still get the bridge's `editMessage`
 * self-handle via `conversationId` + `messageId`.
 */

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay, mintInstanceId } from "@ai-matrx/summon/open";
import { createFullScreenEditorCallbackGroup, disposeFullScreenEditorCallbackGroup } from "./callbacks/fullScreenEditor";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "htmlPreview" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenHtmlPreviewBridgeOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  content: string;
  messageId?: string;
  conversationId?: string;
  title?: string;
  description?: string;
  /**
   * Save handler — receives the edited markdown. Routed through the callback
   * registry (never Redux). When provided, the bridge shows a Save button
   * (unless `showSaveButton` explicitly overrides) and the caller owns the
   * save outcome, taking precedence over the chat-message self-handle path.
   */
  onSave?: (markdownContent: string) => Promise<void>;
  showSaveButton?: boolean;
  isAgentSystem?: boolean;
}

export interface HtmlPreviewBridgeHandle {
  instanceId: string;
  close: () => void;
}

/** The opener as a plain function of dispatch (no hook): what a lazy caller loads on click. */
export function createHtmlPreviewBridgeOpener(dispatch: ReturnType<typeof useAppDispatch>) {
  return (opts: OpenHtmlPreviewBridgeOptions): HtmlPreviewBridgeHandle => {
      const instanceId =
        opts.instanceId ??
        mintInstanceId(OVERLAY_ID);

      let callbackGroupId: string | null = null;
      if (opts.onSave) {
        const onSave = opts.onSave;
        const group = createFullScreenEditorCallbackGroup({
          onSave,
        });
        callbackGroupId = group.callbackGroupId;
      }

      try {
        opener.open(dispatch, { instanceId, data: {
              content: opts.content,
              messageId: opts.messageId,
              conversationId: opts.conversationId,
              title: opts.title,
              description: opts.description,
              callbackGroupId,
              showSaveButton:
                opts.showSaveButton ?? (opts.onSave ? true : undefined),
              isAgentSystem: opts.isAgentSystem,
            } });
      } catch (error) {
        disposeFullScreenEditorCallbackGroup(callbackGroupId);
        throw error;
      }
      return {
        instanceId,
        close: () => {
          dispatch(opener.close(instanceId));
          disposeFullScreenEditorCallbackGroup(callbackGroupId);
        },
      };
  };
}

export function useOpenHtmlPreviewBridge() {
  const dispatch = useAppDispatch();
  return useMemo(() => createHtmlPreviewBridgeOpener(dispatch), [dispatch]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const HtmlPreviewBridgeController = hookController<OpenHtmlPreviewBridgeOptions>(useOpenHtmlPreviewBridge);

export type HtmlPreviewDefinitionData = OpenHtmlPreviewBridgeOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    htmlPreview: OverlayWire<HtmlPreviewDefinitionData>;
  }
}
