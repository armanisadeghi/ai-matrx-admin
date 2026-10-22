/**
 * components/dialogs/clipboard-fallback/ClipboardFallbackHost.tsx
 *
 * Public entry for the manual-copy dialog: re-exports `showManualCopy` (pure TS, cheap to import).
 * The dialog itself is the summon overlay `clipboardFallbackDialog`; nothing mounts until it is asked.
 */

export { showManualCopy } from "./manualCopyOpener";
export type { ManualCopyOptions } from "./manualCopyOpener";
