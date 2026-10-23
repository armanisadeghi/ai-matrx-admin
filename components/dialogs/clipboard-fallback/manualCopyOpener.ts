/**
 * components/dialogs/clipboard-fallback/manualCopyOpener.ts
 *
 * Pure-TS imperative API for the global manual-copy dialog — the last resort when `navigator.clipboard`
 * refuses to write (restricted iframe, embedded browser, permission policy, non-HTTPS). Zero React,
 * statically importable from anywhere. The dialog is the summon overlay `clipboardFallbackDialog`
 * (features/overlays/definitions/), never in the tree until asked; asks queue one at a time in `requestOverlay`.
 *
 * Packages call kit's `openClipboardFallback` instead; `ClipboardFallbackBridge` (mounted in app/Providers)
 * forwards those asks here, so every manual copy in the app is this one overlay.
 *
 * The contract with callers: a copy that lands here has NOT happened. Never toast "Copied" and never flip a
 * copied state — the dialog puts the text in front of the user, selected, and the copy is theirs.
 */

import { requestOverlay } from "@/features/overlays/requestOverlay";

export interface ManualCopyOptions {
  /** The text the user needs on their clipboard. */
  text: string;
  title?: string | undefined;
  description?: string | undefined;
}

/**
 * Put text in front of the user for a manual Cmd/Ctrl+C. Resolves when the dialog closes; nothing to await
 * for correctness, because whether the user copies is theirs.
 */
export function showManualCopy(opts: ManualCopyOptions): Promise<void> {
  if (!opts.text) return Promise.resolve();
  return requestOverlay<ManualCopyOptions, void>("clipboardFallbackDialog", opts, { cancel: undefined });
}
