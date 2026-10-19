/**
 * Re-cleaning an already-cleaned document replaces the
 * clean text, so a manual click asks first (the expensive-click law). A
 * document that is not cleaned yet runs without a question — there is nothing
 * to replace — and the auto-run on open (`force: false`) never reaches here.
 */
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";

export async function confirmRecleanIfCleaned(alreadyCleaned: boolean): Promise<boolean> {
  if (!alreadyCleaned) return true;
  return confirm({
    title: "Re-clean this document?",
    description: "This replaces the current clean text.",
    confirmLabel: "Re-clean",
    cancelLabel: "Cancel",
  });
}
