// features/rich-document/actions/handlers/comment-selection.ts
//
// Right-click "Comment" on selected text (review 4, F12). The unified menu
// draws it right under Copy (`u_comment`, bound to `rich:comment-selection`).
// It shows only while the selection sits inside an area where comments are on
// (an annotation zone that can pin the passage: chat answers, notes, records),
// and it opens THE SAME composer as the selection toolbar's Comment: the
// toolbar opens on that selection and runs its own `selection:comment` action.

import { MessageSquarePlus } from "lucide-react";
import { zonesContaining } from "@ai-matrx/rich-content/selection-toolbar/selection-zones";
import { requestSelectionToolbarAction } from "@/components/selection-toolbar/selection-toolbar-requests";
import { textRangeOf } from "@/components/selection-toolbar/text-range";
import { toast } from "@/lib/toast";
import { ANNOTATION_HOST_KEY, type AnnotationSelectionHost } from "../../annotations/annotation-actions";
import { registerActionIfAbsent } from "./register-if-absent";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";

/** The selection toolbar's own Comment (annotation-actions.tsx). */
export const TOOLBAR_COMMENT_ACTION_ID = "selection:comment";

function annotationHostIn(host: Record<string, unknown> | undefined): AnnotationSelectionHost | null {
  const half = host?.[ANNOTATION_HOST_KEY] as AnnotationSelectionHost | undefined;
  return half?.kind === "annotation" ? half : null;
}

/** True when a comment can be pinned to `range`: it sits in an annotation zone that maps it. */
export function canPinComment(range: Range): boolean {
  return zonesContaining(range.commonAncestorContainer).some((zone) => {
    const host = annotationHostIn(zone.contribution.host);
    return Boolean(host && host.capture({ silent: true, range }));
  });
}

/**
 * The passage THIS open of the menu captured, when a comment can be pinned to it; else null.
 * Decided from `ctx.openSelection` (what the menu captured at this right-click), never from the
 * live selection or a passage kept since an earlier open: after the first open on an answer a
 * right-click collapses the live selection before the menu draws (live 2026-10-21), and a kept
 * passage showed Comment on a later open with nothing selected.
 */
function passageFor(ctx: RichDocumentActionContext): Range | null {
  const open = ctx.openSelection;
  if (!open?.range || !open.text.trim()) return null;
  if (!open.range.startContainer.isConnected) return null;
  // The words selected, never the blank space a triple-click runs on into (the answer's footer).
  const range = textRangeOf(open.range);
  if (!range) return null;
  return canPinComment(range) ? range : null;
}

registerActionIfAbsent({
  id: "comment-selection",
  label: "Comment",
  icon: MessageSquarePlus,
  category: "share",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 4,
  preserveSelection: true,
  visible: (ctx) => passageFor(ctx) !== null,
  run: (ctx) => {
    const range = passageFor(ctx);
    ctx.onClose();
    // After the menu has closed (and handed the selection back): restore it if it is still gone,
    // then the toolbar opens on it and runs its own Comment.
    setTimeout(() => {
      const sel = window.getSelection();
      if (range && sel && (sel.rangeCount === 0 || sel.isCollapsed)) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      if (!requestSelectionToolbarAction(TOOLBAR_COMMENT_ACTION_ID)) {
        console.error("[comment-selection] no selection toolbar is mounted, so the comment composer cannot open.");
        toast.error("Comments can't open here. Select the text and use the toolbar's Comment.");
      }
    }, 0);
  },
});
