"use client";

// THE reason prompt every state change on a person uses (users one-roof B3/F1): one TextInputDialog,
// reason required. The database refuses an admin action on a person with no reason
// (admin._audit_user_action, 22023), so every screen that changes a person asks here first.

import { useState, type ReactNode } from "react";
import { TextInputDialog } from "@ai-matrx/design-system";
import { toast } from "@/lib/toast";

export interface ReasonRequest {
  title: string;
  /** The consequence, ≤2 short sentences (S1). */
  description?: string;
  confirmLabel: string;
  /** Runs with the reason; throw to keep the dialog open (the error is shown as a toast). */
  run: (reason: string) => Promise<void>;
}

export const REASON_PLACEHOLDER = "Reason (recorded in the admin history)";

/** THE reason prompt every state change on a person uses: one TextInputDialog, reason required. */
export function useReasonPrompt(): { askReason: (request: ReasonRequest) => void; reasonDialog: ReactNode } {
  const [request, setRequest] = useState<ReasonRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmReason = async (reason: string) => {
    if (!request) return;
    setBusy(true);
    try {
      await request.run(reason.trim());
      setRequest(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reasonDialog = (
    <TextInputDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open && !busy) setRequest(null);
      }}
      title={request?.title ?? ""}
      description={request?.description}
      placeholder={REASON_PLACEHOLDER}
      confirmLabel={request?.confirmLabel}
      busy={busy}
      onConfirm={confirmReason}
    />
  );
  return { askReason: setRequest, reasonDialog };
}
