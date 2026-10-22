/**
 * components/dialogs/clipboard-fallback/manualCopyOpener.ts
 *
 * Pure-TS imperative API for the global manual-copy dialog — the last
 * resort when `navigator.clipboard` refuses to write (restricted iframe,
 * embedded browser, permission policy, non-HTTPS). Mirrors
 * `confirmDialogOpener.ts` exactly: zero React, statically importable
 * from anywhere. The dialog is the summon overlay `clipboardFallbackDialog`;
 * asks queue one at a time in `requestOverlay`.
 *
 * The contract with callers: a copy that lands here has NOT happened.
 * Never toast "Copied" and never flip a copied state — the dialog puts
 * the text in front of the user, selected, and the copy is theirs.
 *
 * See `copy-commands.ts` → `copyContent` for the ONE
 * copy primitive that routes its terminal failure here.
 */

import { requestOverlay } from "@/features/overlays/requestOverlay";

export interface ManualCopyOptions {
  /** The text the user needs on their clipboard. */
  text: string;
  title?: string;
  description?: string;
}

/**
 * Put text in front of the user for a manual Cmd/Ctrl+C. Fire-and-forget:
 * there is nothing to await, because whether the user copies is theirs.
 */
export function showManualCopy(opts: ManualCopyOptions): void {
  if (!opts.text) return;
  void requestOverlay<ManualCopyOptions, void>("clipboardFallbackDialog", opts, { cancel: undefined });
}
