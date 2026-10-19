"use client";

/**
 * Comments in an open Doc (C9, COLLAB-DESIGN §8): the anchor is a COMMENT custom range in the document body
 * (`@ai-matrx/office/docs` comment-anchors), so it travels in the co-editing room with the text and follows every
 * concurrent edit; the thread lives in platform.comments (part_anchor `anchor:<id>`).
 *
 * Returns the two pieces the editor places: `layer` (inside the canvas wrapper: the highlights over anchored text
 * and the add-comment button beside a selection) and `rail` (the column beside the canvas). Univer draws on a
 * canvas, so positions come from `calcDocRangePositions`, polled like the remote carets. A caret inside a
 * highlight opens its thread. "Add comment" (button, Ctrl/Cmd+Alt+M, the Insert and View menus) anchors the
 * selection at once — the highlight shows while the person writes — and Cancel takes the anchor out again.
 */
import type { Univer } from "@univerjs/core";
import { DocSelectionManagerService } from "@univerjs/docs";
import { calcDocRangePositions } from "@univerjs/docs-ui";
import { CommandType, ICommandService, IUniverInstanceService } from "@univerjs/core";
import { IRenderManagerService } from "@univerjs/engine-render";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { addCommentAnchorActions, commentAnchorsOf, newCommentAnchorId, removeCommentAnchorActions } from "@ai-matrx/office/docs";

import { AnchoredCommentRail, type AnchoredCommentDraft } from "@/features/rich-document/annotations/AnchoredCommentRail";
import { useAnchoredComments } from "@/features/rich-document/annotations/useAnchoredComments";
import { toast } from "@/lib/toast";

const POLL_MS = 120;
const RICH_TEXT_EDITING = "doc.mutation.rich-text-editing";
export const ADD_COMMENT_COMMAND = "matrx.operation.add-comment";
export const TOGGLE_COMMENTS_COMMAND = "matrx.operation.toggle-comments";
const RAIL_KEY = "matrx.office.comment-rail";

type Box = { left: number; right: number; top: number; bottom: number };
type Injector = { get<T>(token: unknown): T };

interface Layout {
  /** anchor id → its line boxes (client coordinates). */
  boxes: Map<string, Box[]>;
  /** anchor id → [start, end) body offsets. */
  spans: Map<string, { start: number; end: number; text: string }>;
  selection: { start: number; end: number; box: Box | null } | null;
}

const EMPTY: Layout = { boxes: new Map(), spans: new Map(), selection: null };

function sameLayout(a: Layout, b: Layout): boolean {
  if (a.spans.size !== b.spans.size || a.boxes.size !== b.boxes.size) return false;
  const key = (l: Layout) =>
    JSON.stringify([[...l.spans].map(([k, v]) => [k, v.start, v.end]), [...l.boxes].map(([k, v]) => [k, v.map((x) => [Math.round(x.left), Math.round(x.top), Math.round(x.right), Math.round(x.bottom)])]), l.selection && [l.selection.start, l.selection.end, l.selection.box && Math.round(l.selection.box.top), l.selection.box && Math.round(l.selection.box.right)]]);
  return key(a) === key(b);
}

function injectorOf(univer: Univer | null): Injector | null {
  return (univer as unknown as { __getInjector?: () => Injector } | null)?.__getInjector?.() ?? null;
}

function readLayout(univer: Univer, unitId: string): Layout {
  const injector = injectorOf(univer);
  if (!injector) return EMPTY;
  const unit = injector.get<{ getUnit(id: string): { getBody(): unknown } | null }>(IUniverInstanceService).getUnit(unitId);
  const body = unit?.getBody() as { dataStream?: string } | undefined;
  if (!body) return EMPTY;
  const spans = commentAnchorsOf(body);
  const render = injector.get<{ getRenderUnitById?: (id: string) => unknown }>(IRenderManagerService).getRenderUnitById?.(unitId) as Parameters<typeof calcDocRangePositions>[1] | undefined;
  const boxes = new Map<string, Box[]>();
  const max = Math.max(0, (body.dataStream?.length ?? 2) - 1);
  const place = (start: number, end: number): Box[] => {
    if (!render) return [];
    try {
      return (calcDocRangePositions({ startOffset: Math.min(start, max), endOffset: Math.min(end, max), collapsed: start === end, segmentId: "", segmentPage: -1 }, render) ?? []) as Box[];
    } catch {
      return []; // the layout is not ready for this offset yet: next tick
    }
  };
  for (const [id, s] of spans) {
    const b = place(s.start, s.end);
    if (b.length) boxes.set(id, b);
  }
  let selection: Layout["selection"] = null;
  try {
    const ranges = injector.get<{ getTextRanges(p: { unitId: string; subUnitId: string }): Array<{ startOffset: number; endOffset: number; segmentId?: string }> | null }>(DocSelectionManagerService).getTextRanges({ unitId, subUnitId: unitId });
    const r = ranges?.[0];
    if (r && !r.segmentId) {
      const start = Math.min(r.startOffset, r.endOffset);
      const end = Math.max(r.startOffset, r.endOffset);
      const last = start === end ? null : place(start, end).at(-1) ?? null;
      selection = { start, end, box: last };
    }
  } catch {
    /* no selection service on this view */
  }
  return { boxes, spans, selection };
}

export interface DocComments {
  layer: ReactNode;
  rail: ReactNode;
  open: boolean;
  toggle: () => void;
}

export function useDocComments({
  univer,
  unitId,
  documentId,
  ready,
  editable,
  wrapperRef,
}: {
  univer: Univer | null;
  unitId: string | null;
  documentId: string;
  ready: boolean;
  editable: boolean;
  wrapperRef: RefObject<HTMLElement | null>;
}): DocComments {
  const href = `/documents/${documentId}`;
  const comments = useAnchoredComments("udt_document", documentId, href, ready);
  const [layout, setLayout] = useState<Layout>(EMPTY);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).get("comment")) return true;
    const kept = window.localStorage.getItem(RAIL_KEY);
    return kept ? kept === "open" : window.matchMedia("(min-width: 1280px)").matches;
  });
  const [active, setActive] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("comment"),
  );
  const [draft, setDraft] = useState<AnchoredCommentDraft | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const setRail = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(RAIL_KEY, next ? "open" : "closed");
    } catch {
      /* private mode */
    }
  };

  const runMutation = (actions: unknown[] | null): boolean => {
    const injector = injectorOf(univer);
    if (!injector || !unitId || !actions) return false;
    try {
      return injector.get<{ syncExecuteCommand(id: string, p: unknown): boolean }>(ICommandService).syncExecuteCommand(RICH_TEXT_EDITING, { unitId, actions, textRanges: undefined }) !== false;
    } catch (err) {
      console.warn("[comments] the anchor could not be written into the document", err);
      return false;
    }
  };

  const addComment = () => {
    if (!editable) {
      toast.error("You can comment once you can edit this document.");
      return;
    }
    const sel = layoutRef.current.selection;
    const injector = injectorOf(univer);
    if (!sel || sel.start === sel.end || !injector || !unitId) {
      toast.error("Select the text you want to comment on.");
      return;
    }
    if (draftRef.current) cancelDraft();
    const body = injector.get<{ getUnit(id: string): { getBody(): unknown } | null }>(IUniverInstanceService).getUnit(unitId)?.getBody() as { dataStream?: string } | undefined;
    const anchorId = newCommentAnchorId();
    if (!body || !runMutation(addCommentAnchorActions(body, sel.start, sel.end, anchorId))) {
      toast.error("We couldn't anchor a comment to that selection.");
      return;
    }
    const quote = (body.dataStream ?? "").slice(sel.start, sel.end).replace(/[\u0000-\u001f]/g, " ");
    setRail(true);
    setActive(null);
    setDraft({ anchorId, quote });
  };

  const cancelDraft = () => {
    const d = draftRef.current;
    setDraft(null);
    if (!d) return;
    const injector = injectorOf(univer);
    const model = injector?.get<{ getUnit(id: string): unknown }>(IUniverInstanceService).getUnit(unitId ?? "");
    if (model) runMutation(removeCommentAnchorActions(model, d.anchorId));
  };

  // Keep the latest handlers for the Univer commands and the keyboard.
  const handlers = useRef({ addComment, toggle: () => setRail(!open) });
  handlers.current = { addComment, toggle: () => setRail(!open) };

  useEffect(() => {
    const injector = injectorOf(univer);
    if (!injector || !ready) return undefined;
    const cs = injector.get<{ registerCommand(c: unknown): { dispose(): void }; hasCommand?(id: string): boolean }>(ICommandService);
    const disposables: Array<{ dispose(): void }> = [];
    for (const [id, run] of [
      [ADD_COMMENT_COMMAND, () => handlers.current.addComment()],
      [TOGGLE_COMMENTS_COMMAND, () => handlers.current.toggle()],
    ] as const) {
      if (cs.hasCommand?.(id)) continue;
      disposables.push(cs.registerCommand({ id, type: CommandType.OPERATION, handler: () => (run(), true) }));
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        handlers.current.addComment();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      for (const d of disposables) d.dispose();
    };
  }, [univer, ready]);

  // Poll the layout (Univer paints on a canvas; nothing tells us a line moved).
  useEffect(() => {
    if (!univer || !unitId || !ready) return undefined;
    const tick = () => {
      let next = EMPTY;
      try {
        next = readLayout(univer, unitId);
      } catch (err) {
        console.warn("[comments] could not place the comment highlights", err);
      }
      setLayout((prev) => (sameLayout(prev, next) ? prev : next));
    };
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
  }, [univer, unitId, ready]);

  // A caret inside a highlight opens its thread (Google's click-on-highlight).
  const threadsByAnchor = new Map(comments.threads.filter((t) => t.anchorId && !t.resolvedAt).map((t) => [t.anchorId!, t.id]));
  const caret = layout.selection && layout.selection.start === layout.selection.end ? layout.selection.start : null;
  useEffect(() => {
    if (caret === null) return;
    for (const [anchorId, span] of layout.spans) {
      if (caret > span.start && caret < span.end) {
        const id = threadsByAnchor.get(anchorId);
        if (id) setActive(id);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the caret only
  }, [caret]);

  const origin = wrapperRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
  const activeAnchor = comments.threads.find((t) => t.id === active)?.anchorId ?? null;
  const shown = new Set<string>([...threadsByAnchor.keys(), ...(draft ? [draft.anchorId] : [])]);

  const layer = (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" data-comment-highlights="">
      {[...layout.boxes].flatMap(([anchorId, boxes]) =>
        shown.has(anchorId)
          ? boxes.map((b, i) => (
              <div
                key={`${anchorId}:${i}`}
                data-comment-anchor={anchorId}
                className={
                  anchorId === activeAnchor || anchorId === draft?.anchorId
                    ? "absolute bg-amber-400/45 dark:bg-amber-400/35"
                    : "absolute bg-amber-300/30 dark:bg-amber-400/20"
                }
                style={{ left: b.left - origin.left, top: b.top - origin.top, width: Math.max(b.right - b.left, 2), height: b.bottom - b.top }}
              />
            ))
          : [],
      )}
      {editable && layout.selection?.box && !draft ? (
        <button
          type="button"
          aria-label="Add comment"
          title="Add comment (Ctrl+Alt+M)"
          data-add-comment=""
          className="pointer-events-auto absolute flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md hover:bg-accent"
          style={{ left: layout.selection.box.right - origin.left + 8, top: layout.selection.box.top - origin.top - 4 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => addComment()}
        >
          <MessageSquarePlus className="size-4" />
        </button>
      ) : null}
    </div>
  );

  const anchorTops = new Map<string, number>();
  for (const [id, boxes] of layout.boxes) if (boxes[0]) anchorTops.set(id, boxes[0].top);

  const rail = open ? (
    <AnchoredCommentRail
      source={{ token: "udt_document", id: documentId, title: "", body: "", contentVersion: 0, href }}
      comments={comments}
      anchorTops={anchorTops}
      present={new Set(layout.spans.keys())}
      removedLabel="Text removed"
      activeThreadId={active}
      onActivate={setActive}
      draft={draft}
      onDraftDone={(id) => {
        if (id) {
          setDraft(null);
          setActive(id);
        } else cancelDraft();
      }}
      onClose={() => setRail(false)}
      canComment={editable}
    />
  ) : null;

  return { layer, rail, open, toggle: () => setRail(!open) };
}
