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
import { toast } from "@/lib/toast";
import { ANNOTATION_HOST_KEY, type AnnotationSelectionHost } from "../../annotations/annotation-actions";
import { registerActionIfAbsent } from "./register-if-absent";

export const COMMENT_SELECTION_ACTION_ID = "comment-selection";
/** The selection toolbar's own Comment (annotation-actions.tsx). */
export const TOOLBAR_COMMENT_ACTION_ID = "selection:comment";

function annotationHostIn(host: Record<string, unknown> | undefined): AnnotationSelectionHost | null {
  const half = host?.[ANNOTATION_HOST_KEY] as AnnotationSelectionHost | undefined;
  return half?.kind === "annotation" ? half : null;
}

/** The live selection, when it sits where a comment can be pinned; else null. */
export function commentableSelection(): Range | null {
  if (typeof window === "undefined") return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) return null;
  const range = sel.getRangeAt(0);
  const pinnable = zonesContaining(range.commonAncestorContainer).some((zone) => {
    const host = annotationHostIn(zone.contribution.host);
    return Boolean(host && host.capture({ silent: true }));
  });
  return pinnable ? range : null;
}

// The passage the menu opened on: a click inside the menu may clear the live selection before
// the row runs, and the toolbar needs that selection back to pin the comment to it.
let openedOn: Range | null = null;

registerActionIfAbsent({
  id: COMMENT_SELECTION_ACTION_ID,
  label: "Comment",
  icon: MessageSquarePlus,
  category: "share",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 4,
  preserveSelection: true,
  visible: () => {
    const range = commentableSelection();
    openedOn = range ? range.cloneRange() : null;
    return range !== null;
  },
  run: (ctx) => {
    const live = commentableSelection();
    const range = live ? live.cloneRange() : openedOn;
    openedOn = null;
    ctx.onClose();
    // After the menu has closed (and handed the selection back): restore it if it was lost, then
    // the toolbar opens on it and runs its own Comment.
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
