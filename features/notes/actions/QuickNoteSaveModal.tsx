// features/notes/actions/QuickNoteSaveModal.tsx
// Back-compat shim: the old Modal now resolves to the new redux-backed
// QuickNoteSaveDialog (Dialog on desktop, Drawer on mobile).
"use client";

import { QuickNoteSaveDialog } from "./quick-save/QuickNoteSaveDialog";

export const QuickNoteSaveModal = QuickNoteSaveDialog;
export type { QuickNoteSaveDialogProps as QuickNoteSaveModalProps } from "./quick-save/QuickNoteSaveDialog";
