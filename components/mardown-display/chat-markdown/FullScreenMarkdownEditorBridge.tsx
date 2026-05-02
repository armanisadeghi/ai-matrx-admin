"use client";

/**
 * FullScreenMarkdownEditorBridge — registry adapter for `FullScreenMarkdownEditor`.
 *
 * `UnifiedOverlayController` -> `OverlaySurface` spreads the overlay's `data`
 * payload onto the registered component as props. Our overlay data shape
 * (defined by `openFullScreenEditor` in `lib/redux/slices/overlaySlice.ts`)
 * uses keys `content` and the surface injects `onClose` — but
 * `FullScreenMarkdownEditor` exposes its props as `initialContent` and
 * `onCancel`. Without an adapter, the editor mounted with `initialContent`
 * undefined (renders empty) and `onCancel` undefined (Esc/Cancel were no-ops,
 * which felt like a hard freeze).
 *
 * This bridge mirrors the legacy glue code that used to live inline in
 * `components/overlays/OverlayController.tsx` (now orphaned — only
 * `UnifiedOverlayController` is mounted in `app/DeferredSingletons.tsx` and
 * `app/(public)/PublicProviders.tsx`). It:
 *
 *   1. maps `content` → `initialContent` and `onClose` → `onCancel`
 *   2. wires `onChange` to mirror every keystroke into `overlayDataSlice` so
 *      content survives close/reopen for the same `instanceId`
 *   3. dispatches the right save thunk based on `mode`:
 *        - "assistant-message" → `editMessage` against `cx_message`
 *        - "free" / undefined  → falls back to a legacy `onSave` callback if
 *          the caller provided one (kept for unmigrated call sites)
 *
 * Use this bridge as the registry's `componentImport` target — never import
 * `FullScreenMarkdownEditor` directly from `windowRegistry.ts`.
 */

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  closeOverlay,
  type FullScreenEditorMode,
} from "@/lib/redux/slices/overlaySlice";
import { updateOverlayData } from "@/lib/redux/slices/overlayDataSlice";

const FullScreenMarkdownEditor = dynamic(
  () =>
    import("@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor"),
  { ssr: false },
);

type TabId = "write" | "matrx_split" | "markdown" | "wysiwyg" | "preview";

interface FullScreenMarkdownEditorBridgeProps {
  isOpen: boolean;
  instanceId?: string;
  onClose: () => void;
  // Data payload spread from overlay state by OverlaySurface:
  content?: string;
  mode?: FullScreenEditorMode;
  conversationId?: string;
  messageId?: string;
  /** Legacy callback path for callers not yet migrated to `mode`. */
  onSave?: (newContent: string) => void;
  tabs?: TabId[];
  initialTab?: TabId;
  analysisData?: Record<string, unknown>;
  title?: string;
  description?: string;
  showSaveButton?: boolean;
  showCopyButton?: boolean;
}

export function FullScreenMarkdownEditorBridge({
  isOpen,
  instanceId = "default",
  onClose,
  content = "",
  mode,
  conversationId,
  messageId,
  onSave,
  tabs,
  initialTab,
  analysisData,
  title,
  description,
  showSaveButton,
  showCopyButton,
}: FullScreenMarkdownEditorBridgeProps) {
  const dispatch = useAppDispatch();

  const handleChange = useCallback(
    (newContent: string) => {
      dispatch(
        updateOverlayData({
          overlayId: "fullScreenEditor",
          instanceId,
          updates: { content: newContent },
        }),
      );
    },
    [dispatch, instanceId],
  );

  const handleSave = useCallback(
    async (newContent: string) => {
      dispatch(
        updateOverlayData({
          overlayId: "fullScreenEditor",
          instanceId,
          updates: { content: newContent },
        }),
      );

      try {
        if (mode === "assistant-message" && conversationId && messageId) {
          const { editMessage } =
            await import("@/features/agents/redux/execution-system/message-crud/edit-message.thunk");
          const nextContent = [
            { type: "text", text: newContent },
          ] as unknown as import("@/types/database.types").Json;
          await dispatch(
            editMessage({
              conversationId,
              messageId,
              newContent: nextContent,
            }),
          ).unwrap();
          const { toast } = await import("sonner");
          toast.success("Message saved");
        } else if (typeof onSave === "function") {
          onSave(newContent);
        }
      } catch (err) {
        const { toast } = await import("sonner");
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" &&
                err &&
                "message" in err &&
                typeof (err as { message?: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Save failed";
        console.error("[FullScreenMarkdownEditorBridge] save failed", err);
        toast.error(msg);
      }

      dispatch(closeOverlay({ overlayId: "fullScreenEditor", instanceId }));
    },
    [dispatch, instanceId, mode, conversationId, messageId, onSave],
  );

  return (
    <FullScreenMarkdownEditor
      isOpen={isOpen}
      initialContent={content}
      onSave={handleSave}
      onChange={handleChange}
      onCancel={onClose}
      tabs={tabs}
      initialTab={initialTab}
      analysisData={analysisData}
      messageId={messageId}
      title={title}
      description={description}
      showSaveButton={showSaveButton}
      showCopyButton={showCopyButton}
    />
  );
}

export default FullScreenMarkdownEditorBridge;
