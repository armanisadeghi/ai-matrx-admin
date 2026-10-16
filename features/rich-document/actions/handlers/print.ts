// features/rich-document/actions/handlers/print.ts
//
// `full-print` requires the host to wire an `onFullPrint` callback (full-page render that
// includes all blocks, currently a chat-specific renderer feature). Plain `print` is
// @ai-matrx/chat's own (message-actions W1a); this app's block printers stay registered here,
// so the package's print still prints every embedded artifact.

import { ScanLine } from "lucide-react";
import { registerActionIfAbsent } from "./register-if-absent";
// Each embedded block prints through its type's adapter (the one block-printer registry).
import "@/features/canvas/artifact-types/artifact-printers";

registerActionIfAbsent({
  id: "full-print",
  label: (ctx) => {
    const ext =
      ctx.extensions?.type === "chat-message"
        ? ctx.extensions
        : null;
    return ext?.isCapturing ? "Generating PDF…" : "Full Print (all blocks)";
  },
  icon: ScanLine,
  iconColor: "text-slate-600 dark:text-slate-300",
  category: "export",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 11,
  visible: (ctx) => {
    if (!ctx.callbacks?.onFullPrint) return false;
    if (ctx.extensions?.type === "chat-message") {
      return ctx.extensions.showFullPrint;
    }
    // Non-chat hosts can opt in by providing onFullPrint without the chat
    // extension — assume they meant it.
    return true;
  },
  disabled: (ctx) => {
    if (ctx.extensions?.type === "chat-message" && ctx.extensions.isCapturing) {
      return { reason: "PDF generation in progress" };
    }
    return false;
  },
  run: (ctx) => {
    const isCapturing =
      ctx.extensions?.type === "chat-message"
        ? ctx.extensions.isCapturing
        : false;
    if (!isCapturing) {
      ctx.callbacks?.onFullPrint?.();
    }
  },
});
