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
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";

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

// The last passage a comment could be pinned to. A right-click on live collapses the browser
// selection before the menu draws (the menu keeps its own copy and puts it back on close), so the
// row is decided from this: matched against the selection the menu captured (`applicationScope`),
// or, when the menu's context is from an earlier open, by the collapse being THIS right-click's
// (no collapse seen since the passage was taken, or one a moment ago).
let remembered: { range: Range; text: string; at: number } | null = null;
let collapsedAt = 0;
const REMEMBER_MS = 60_000;
const THIS_CLICK_MS = 1_500;

function rememberSelection(): void {
  const range = commentableSelection();
  if (range) remembered = { range: range.cloneRange(), text: range.toString().trim(), at: Date.now() };
}

if (typeof document !== "undefined") {
  let timer: ReturnType<typeof setTimeout> | null = null;
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) collapsedAt = Date.now();
    if (timer) clearTimeout(timer);
    timer = setTimeout(rememberSelection, 120);
  });
}

/** The passage this menu opened on, when a comment can be pinned to it; else null. */
function passageFor(ctx: RichDocumentActionContext): Range | null {
  const live = commentableSelection();
  if (live) return live.cloneRange();
  if (!remembered || Date.now() - remembered.at > REMEMBER_MS) return null;
  // A re-render moves a live range (removed nodes collapse it onto their parent): the passage is gone.
  const kept = remembered.range;
  if (!kept.startContainer.isConnected || kept.collapsed || kept.toString().trim() !== remembered.text) return null;
  const collapsedByThisClick = collapsedAt <= remembered.at || Date.now() - collapsedAt < THIS_CLICK_MS;
  if (collapsedByThisClick) return remembered.range;
  // Or the menu captured this very passage (its copy may be the selection written back as markdown).
  const captured = String(ctx.applicationScope?.selection ?? "").trim();
  if (!captured) return null;
  const words = (t: string) => t.replace(/[*_`#>[\]()-]/g, " ").replace(/\s+/g, " ").trim();
  return words(captured).includes(words(remembered.text)) || words(remembered.text).includes(words(captured)) ? remembered.range : null;
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
