"use client";

/**
 * ExportAcknowledgeDialog — E-24 `sent|generated → acknowledged`.
 *
 * The reference belongs to the RECEIVING system and is opaque to us, so it is typed in, not
 * generated: it is the string a payroll administrator can quote back to their payroll provider
 * when something is queried months later.
 *
 * 🚨 ACKNOWLEDGING IS A ONE-WAY DOOR, AND THE DIALOG SAYS SO BEFORE THE CLICK. Once an export is
 * acknowledged it can never be superseded, regenerated or re-sent — the only correction path left
 * is an adjustment in the NEXT export. That is not a detail to discover in a 409.
 *
 * Uses the platform `<TextInputDialog />`. Browser dialogs are banned.
 */

import { useState } from "react";
import { TextInputDialog } from "@ai-matrx/design-system";

export function ExportAcknowledgeDialog({
  open,
  onOpenChange,
  exportVersion,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportVersion: number;
  /** Receives the acknowledgement reference. Rejecting keeps the dialog open. */
  onConfirm: (acknowledgementRef: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <TextInputDialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      title={`Record acknowledgement for version ${exportVersion}`}
      description={
        <>
          <p>
            Enter the reference your payroll system gave you when it accepted
            this file — a batch number, an import id, a confirmation code.
          </p>
          <p className="mt-2 font-medium text-foreground">
            Once acknowledged, this export can never be superseded, regenerated
            or re-sent. Corrections go in the next export as an adjustment.
          </p>
        </>
      }
      placeholder="e.g. QBO-2026-03-IMPORT-4471"
      confirmLabel="Record acknowledgement"
      busy={busy}
      validate={(value) =>
        value.trim().length === 0
          ? "Enter the reference your payroll system gave you."
          : null
      }
      onConfirm={async (value) => {
        setBusy(true);
        try {
          await onConfirm(value.trim());
          onOpenChange(false);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
