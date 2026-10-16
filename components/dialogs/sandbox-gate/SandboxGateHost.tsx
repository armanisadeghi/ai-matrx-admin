/**
 * components/dialogs/sandbox-gate/SandboxGateHost.tsx
 *
 * Public entry point for the sandbox pre-send gate dialog: re-exports the
 * imperative `openSandboxGate` API (pure TS, cheap to import). The body,
 * `SandboxGateHostBody.tsx`, renders inside `<DialogHosts />`
 * (components/dialogs/host/), which loads on first engagement.
 */

"use client";

export { openSandboxGate } from "./sandboxGateOpener";
export type {
  SandboxGateChoice,
  SandboxGateOptions,
} from "./sandboxGateOpener";
