/**
 * components/dialogs/sandbox-gate/sandboxGateOpener.ts
 *
 * Pure-TS imperative API for the sandbox pre-send gate dialog. Zero React,
 * zero dialog markup — statically importable from anywhere (Redux thunks
 * especially). Resolves a THREE-value choice rather than a boolean, because
 * the gate offers three distinct actions:
 *
 *   • "attach"  — the user attached / re-selected a live sandbox in the
 *                 embedded panel and wants to retry the send with it.
 *   • "detach"  — send WITHOUT a sandbox (the binding is cleared downstream).
 *   • "cancel"  — go back; the send is aborted and the composer text is kept.
 *
 * THE MACHINERY IS NOT OURS. The dialog is the summon overlay `sandboxGateDialog`
 * (features/overlays/definitions); the ask/answer bridge is `requestOverlay`
 * over summon's one-shot request handle. Never re-implement either here.
 */

import { requestOverlay } from "@/features/overlays/requestOverlay";

export type SandboxGateChoice = "attach" | "detach" | "cancel";

export interface SandboxGateOptions {
  conversationId: string;
}

/**
 * Open the sandbox gate. Resolves with the user's choice. Dismissing the
 * dialog (Esc / backdrop / X) resolves `"cancel"` so a stray dismiss never
 * sends.
 */
export function openSandboxGate(
  opts: SandboxGateOptions,
): Promise<SandboxGateChoice> {
  // One gate per conversation: a double-fired send must not stack a second
  // dialog on top of the first — both sends await the one answer.
  return requestOverlay<SandboxGateOptions, SandboxGateChoice>("sandboxGateDialog", opts, {
    cancel: "cancel",
    dedupeKey: opts.conversationId,
  });
}
