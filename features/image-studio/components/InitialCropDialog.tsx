"use client";

/**
 * InitialCropDialog
 * ─────────────────────────────────────────────────────────────────────────
 * Modal Dialog wrapper around InitialCropPanel. Pops up the moment a
 * user drops / pastes / picks one or more images into the Image Studio,
 * BEFORE any preset processing happens.
 *
 * All cropping behavior, pointer logic, queue advancement, and final
 * encoding live in `InitialCropPanel.tsx`. This file owns nothing but
 * the modal chrome.
 *
 * Behavior carried over verbatim from the original implementation:
 *   • Default rect is the entire image — clicking the primary button
 *     with no adjustments passes the file through untouched (no canvas
 *     re-encode, zero quality loss).
 *   • Multiple files are walked through one at a time.
 *
 * For a non-modal floating-window presentation, see InitialCropWindow.
 */

import React, { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crop } from "lucide-react";
import {
  InitialCropApplyButton,
  InitialCropAspectBar,
  InitialCropQueueBadge,
  InitialCropSkipButton,
  InitialCropViewport,
  useInitialCropController,
} from "./InitialCropPanel";

interface InitialCropDialogProps {
  /** Queue of files to walk through. Empty → dialog stays closed. */
  files: File[];
  /** Fired once every file has been processed (kept-as-is OR cropped). */
  onComplete: (results: File[]) => void;
  /** User dismissed the dialog entirely — discard all queued files. */
  onCancel: () => void;
}

export function InitialCropDialog({
  files,
  onComplete,
  onCancel,
}: InitialCropDialogProps) {
  const controller = useInitialCropController({ files, onComplete, onCancel });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) controller.requestClose();
    },
    [controller],
  );

  return (
    <Dialog open={controller.open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Crop className="h-4 w-4 text-primary" />
                Crop before processing
              </DialogTitle>
              <DialogDescription className="text-xs">
                Drag the rectangle, its corners, or its edges to keep just part
                of the image. Leave it as-is to use the full original.
              </DialogDescription>
            </div>
            <InitialCropQueueBadge controller={controller} />
          </div>
        </DialogHeader>

        <InitialCropViewport controller={controller} className="h-[60vh]" />

        <InitialCropAspectBar controller={controller} />

        <DialogFooter className="px-5 py-3 border-t border-border bg-muted/30 sm:justify-between gap-2">
          {controller.totalFiles > 1 ? (
            <InitialCropSkipButton controller={controller} />
          ) : (
            <span />
          )}
          <InitialCropApplyButton controller={controller} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
