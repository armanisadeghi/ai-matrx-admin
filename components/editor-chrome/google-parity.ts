/**
 * Google parity rows the three editors share: a Coming Soon row (`soon`), Google's Extensions
 * menu, and the head of Google's Help menu. Pure data (the announce module loads on click), so
 * the menu builders stay testable without React.
 */

import { CircleHelp, Code2, FileText, GraduationCap, Megaphone, MessageSquareWarning, Puzzle, Repeat2, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import { openOutbound } from "@ai-matrx/kit/outbound";

import type { EditorMenu, EditorMenuAction, EditorMenuEntry, EditorShortcut } from "./editor-menu-model";

export const sep: EditorMenuEntry = { kind: "separator" };

/** A Google row we cannot run yet: muted, and clicking it announces the registered promise. */
export function soon(
  id: string,
  label: string,
  promise: string,
  opts: { icon?: ComponentType<{ className?: string }>; keywords?: string[]; shortcut?: EditorShortcut } = {},
): EditorMenuAction {
  return {
    kind: "action",
    id,
    label,
    soon: promise,
    ...opts,
    run: () => import("@/lib/coming-soon/announce").then((m) => m.announceComingSoon(promise)),
  };
}

export type GoogleProduct = "sheets" | "docs" | "slides";

/** Google's Extensions menu (the host's own tools follow these rows). */
export function googleExtensionsMenu(product: GoogleProduct): EditorMenu {
  return {
    id: "extensions",
    label: "Extensions",
    items: [
      soon("extensions.add-ons", "Add-ons", "editor.extensions.add-ons", { icon: Puzzle }),
      ...(product === "sheets" ? [soon("extensions.macros", "Macros", "editor.extensions.macros", { icon: Repeat2 })] : []),
      soon("extensions.scripts", "Scripts", "editor.extensions.scripts", { icon: Code2, keywords: ["apps script", "automation"] }),
    ],
  };
}

function openPage(href: string) {
  if (typeof window !== "undefined") openOutbound(href, "_blank", "noopener");
}

/** The head of Google's Help menu; the editor's own rows (shortcuts, function list) follow. */
export function googleHelpHead(opts: { sendFeedback?: () => void } = {}): EditorMenuEntry[] {
  return [
    soon("help.search", "Help", "editor.help.search", { icon: CircleHelp }),
    soon("help.training", "Training", "editor.help.training", { icon: GraduationCap }),
    soon("help.updates", "Updates", "editor.help.updates", { icon: Megaphone }),
    ...(opts.sendFeedback
      ? [{ kind: "action" as const, id: "help.feedback", label: "Send feedback", icon: MessageSquareWarning, keywords: ["report", "bug", "improve"], run: opts.sendFeedback }]
      : []),
    sep,
    { kind: "action", id: "help.privacy", label: "Privacy Policy", icon: ShieldCheck, run: () => openPage("/privacy-policy") },
    { kind: "action", id: "help.terms", label: "Terms of Service", icon: FileText, run: () => openPage("/terms-of-service") },
    sep,
  ];
}
