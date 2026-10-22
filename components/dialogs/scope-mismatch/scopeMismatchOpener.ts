/**
 * components/dialogs/scope-mismatch/scopeMismatchOpener.ts
 *
 * Pure-TS imperative API for the global chat↔scope mismatch dialog — the
 * 3-way "ask on mismatch" pre-send gate (decision logic lives in
 * `features/scopes/utils/scopeMismatch.ts`). Zero React, zero dialog markup;
 * statically importable from thunks, hooks and async handlers.
 *
 * THE MACHINERY IS NOT OURS. The dialog is the summon overlay `scopeMismatchDialog`
 * (features/overlays/definitions); the ask/answer bridge is `requestOverlay`.
 */

import { requestOverlay } from "@/features/overlays/requestOverlay";

import type {
  ScopeMismatchChoice,
  ScopeMismatchDisplayItem,
} from "@/features/scopes/utils/scopeMismatch";

export interface ScopeMismatchRequest {
  /** The user's current active (sidebar) selection, resolved to names. */
  current: ScopeMismatchDisplayItem[];
  /** The chat's durable scope tags, resolved to names. */
  chat: ScopeMismatchDisplayItem[];
}

/**
 * Imperative 3-way mismatch prompt. Resolves with the user's choice:
 * `"update"` (use current selection), `"combine"` (union both),
 * `"keep"` (keep the chat's context), or `"cancel"` on dismiss —
 * a cancel aborts the send entirely (composer text stays intact).
 */
export function promptScopeMismatch(
  req: ScopeMismatchRequest,
): Promise<ScopeMismatchChoice> {
  return requestOverlay<ScopeMismatchRequest, ScopeMismatchChoice>("scopeMismatchDialog", req, {
    cancel: "cancel",
  });
}
