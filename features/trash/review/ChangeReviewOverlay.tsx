"use client";

/**
 * ChangeReviewOverlay — the `changeReviewWindow` overlay: THE review window for archiving or moving any record,
 * opened from anywhere by `useOpenChangeReviewWindow()` (features/overlays/openers/changeReviewWindow.tsx).
 * A finished move's toast carries "Undo move" (the engine walks it back by its plan); a finished archive's
 * toast carries "Undo" (restore by plan).
 */

import { commitChange, previewChange, restoreChange, type ChangeDone, type ChangeTarget } from "@ai-matrx/data/db";
import { ChangeReviewWindow } from "@/features/trash/review/ChangeReviewWindow";
import { supabase } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";

export interface ChangeReviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  target: ChangeTarget;
  title: string;
  recordName: string;
  currentOrganizationId?: string | null;
}

async function undoMove(planId: string, name: string) {
  try {
    const preview = await previewChange(supabase, { verb: "undo", planId });
    const result = await commitChange(supabase, { verb: "undo", planId }, {}, preview.fingerprint);
    if (result.status === "done") toast.success(`Moved ${name} back to ${result.organization?.name ?? "its organization"}`);
    else toast.info("This changed since the move. Open it and move it back.");
  } catch (error) {
    toast.error("Could not undo the move", { description: extractErrorMessage(error) });
  }
}

export default function ChangeReviewOverlay({ isOpen, onClose, target, title, recordName, currentOrganizationId }: ChangeReviewOverlayProps) {
  if (!isOpen) return null;
  const done = (result: ChangeDone) => {
    onClose();
    if (target.verb === "move") {
      toast.success(`Moved ${recordName} to ${result.organization?.name ?? "the other organization"}`, {
        action: { label: "Undo move", onClick: () => void undoMove(result.plan_id, recordName) },
      });
      return;
    }
    if (target.verb === "delete") {
      toast.success(`Archived ${recordName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            restoreChange(supabase, result.plan_id)
              .then(() => toast.success(`Restored ${recordName}`))
              .catch((error: unknown) => toast.error("Could not restore", { description: extractErrorMessage(error) }));
          },
        },
      });
      return;
    }
    toast.success(`${title} done`);
  };
  return (
    <ChangeReviewWindow
      title={title}
      target={target}
      currentOrganizationId={currentOrganizationId ?? null}
      onClose={onClose}
      onDone={done}
    />
  );
}
