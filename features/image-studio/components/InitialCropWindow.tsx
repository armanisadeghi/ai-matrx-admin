"use client";

/**
 * @registry-status: inline-window
 * InitialCropWindow
 * ─────────────────────────────────────────────────────────────────────────
 * Floating WindowPanel wrapper around InitialCropPanel. Rendered inside
 * a draggable / resizable / pop-out-able window — the canonical
 * pre-variant crop step for the Image Studio. (An older `InitialCropDialog`
 * modal wrapper existed in earlier revisions and was deleted in 2026-05;
 * this Window form is the only initial-crop wrapper now.)
 *
 * Use this when:
 *   • The crop step needs to coexist with another working surface (e.g.
 *     side-by-side with a chat or a list of images), or
 *   • The user should be able to move the cropper out of the way
 *     without dismissing it.
 *
 * The parent controls the queue: render with a
 * non-empty `files` array to show the window, listen for
 * `onComplete(results)` once the queue finishes, and `onCancel()` if
 * the user closes the window mid-queue.
 *
 * NOTE — not registered in the window-panels registry.
 * `File[]` blobs and `(files: File[]) => void` callbacks cannot survive
 * Redux serialization, so this window is mounted directly by callers
 * (same render pattern as the dialog) rather than dispatched through
 * `openOverlay`. If a registry-mounted version is ever needed, swap
 * `files` for a callback-bus group id (see ImageUploaderWindow).
 */

import React, { useCallback } from "react";
import { Crop } from "lucide-react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import {
  InitialCropApplyButton,
  InitialCropAspectBar,
  InitialCropQueueBadge,
  InitialCropSkipButton,
  InitialCropViewport,
  useInitialCropController,
} from "./InitialCropPanel";

interface InitialCropWindowProps {
  /** Queue of files to walk through. Empty → window stays unmounted. */
  files: File[];
  /** Fired once every file has been processed (kept-as-is OR cropped). */
  onComplete: (results: File[]) => void;
  /** User dismissed the window entirely — discard all queued files. */
  onCancel: () => void;
  /**
   * Stable instance id, in case multiple crop windows ever coexist on a
   * single page. Defaults to the singleton id used elsewhere; pass a
   * unique value (e.g. an upload session id) when you need parallel
   * windows with independent geometry.
   */
  instanceId?: string;
}

export function InitialCropWindow({
  files,
  onComplete,
  onCancel,
  instanceId,
}: InitialCropWindowProps) {
  const controller = useInitialCropController({ files, onComplete, onCancel });

  const handleClose = useCallback(() => {
    controller.requestClose();
  }, [controller]);

  if (!controller.open) return null;

  return (
    <WindowPanel
      id={
        instanceId ? `initial-crop-window-${instanceId}` : "initial-crop-window"
      }
      title="Crop before processing"
      titleNode={
        <span className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-primary" />
          Crop before processing
        </span>
      }
      onClose={handleClose}
      minWidth={520}
      minHeight={480}
      width={840}
      height={680}
      position="center"
      bodyClassName="flex flex-col min-h-0"
      actionsRight={<InitialCropQueueBadge controller={controller} />}
      footerLeft={<InitialCropSkipButton controller={controller} />}
      footerRight={<InitialCropApplyButton controller={controller} />}
    >
      <div className="flex flex-col min-h-0 h-full">
        <p className="px-5 pt-3 pb-2 text-xs text-muted-foreground border-b border-border">
          Drag the rectangle, its corners, or its edges to keep just part of the
          image. Leave it as-is to use the full original.
        </p>
        <InitialCropViewport
          controller={controller}
          className="flex-1 min-h-0"
        />
        <InitialCropAspectBar controller={controller} />
      </div>
    </WindowPanel>
  );
}

export default InitialCropWindow;
