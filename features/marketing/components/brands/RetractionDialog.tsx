"use client";

/**
 * RetractionDialog — THE undo for a decision that pulled data in (common-docs smart-add-brand/UNDO.md).
 *
 * Used by the validation page (undo an "Ours" account or website) and the brand page (remove an account or
 * website). Opens with the live preview from `web.decision_retraction` (nothing changed yet), names exactly
 * what goes and what is re-checked, offers "Not us" (on by default), and applies on confirm.
 */

import { useEffect, useState } from "react";
import { Switch } from "@ai-matrx/design-system/controls";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import {
  applyRetraction,
  previewRetraction,
  retractionAlso,
  retractionParts,
  type RetractionRootType,
  type RetractionSummary,
} from "@/features/marketing/data/retraction";

export interface RetractionTarget {
  rootType: RetractionRootType;
  rootId: string;
  /** What the person sees named in the title ("@vivaespana", "ritualcoffee.com"). */
  name: string;
}

export function retractionConsequence(s: RetractionSummary | null): string {
  if (!s) return "Checking what this brought in…";
  const parts = retractionParts(s);
  const also = retractionAlso(s);
  const head = parts.length ? `Removes ${parts.join(", ")}.` : "Removes it from this brand.";
  return also.length ? `${head} Also ${also.join(", ")}.` : head;
}

export function RetractionDialog({
  target,
  onCancel,
  onDone,
}: {
  target: RetractionTarget | null;
  onCancel: () => void;
  onDone: (summary: RetractionSummary) => void;
}) {
  const [preview, setPreview] = useState<RetractionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notUs, setNotUs] = useState(true);
  const [busy, setBusy] = useState(false);

  const rootType = target?.rootType ?? null;
  const rootId = target?.rootId ?? null;
  useEffect(() => {
    if (!rootType || !rootId) return;
    let live = true;
    setPreview(null);
    setError(null);
    setNotUs(true);
    previewRetraction(rootType, rootId)
      .then((s) => live && setPreview(s))
      .catch((e: unknown) => live && setError(extractErrorMessage(e)));
    return () => {
      live = false;
    };
  }, [rootType, rootId]);

  return (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && !busy && onCancel()}
      title={target ? `Undo ${target.name}?` : "Undo?"}
      description={error ? `Could not check what this brought in: ${error}` : retractionConsequence(preview)}
      content={
        <label className="flex items-center justify-between gap-3 text-sm" data-testid="retraction-not-us">
          <span>Mark as not us</span>
          <Switch checked={notUs} onCheckedChange={setNotUs} aria-label="Mark as not us" />
        </label>
      }
      variant="destructive"
      confirmLabel="Undo and remove"
      busy={busy}
      confirmHeld={!preview && !error}
      confirmDisabled={Boolean(error)}
      onConfirm={async () => {
        if (!target) return;
        setBusy(true);
        try {
          const done = await applyRetraction(target.rootType, target.rootId, notUs);
          toast.success(`Undone: ${target.name}`, { description: retractionConsequence(done).replace(/^Removes/, "Removed") });
          onDone(done);
        } catch (e) {
          toast.error("Could not undo", { description: extractErrorMessage(e) });
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
