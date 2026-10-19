"use client";

/**
 * Cell comments in an open workbook (C9, COLLAB-DESIGN §8): the anchor is the workbook resource that
 * `@ai-matrx/office/sheets/comment-anchors` keeps (anchor id → cell), changed only by its own mutation, which
 * travels in the co-editing room and follows every row/column insert, remove and move; the thread lives in
 * platform.comments (part_anchor `anchor:<id>`). A removed row, column or sheet takes the anchor out and the
 * thread shows "Cell removed".
 *
 * Returns `layer` (inside the canvas wrapper: an amber corner mark and outline on each commented cell of the
 * sheet on screen) and `rail` (the column beside it; threads align with their cell). "Comment" (Insert menu,
 * toolbar, Ctrl/Cmd+Alt+M) comments on the active cell.
 */
import type { Univer } from "@univerjs/core";
import { CommandType, ICommandService } from "@univerjs/core";
import { IRenderManagerService } from "@univerjs/engine-render";
import { SheetSkeletonManagerService } from "@univerjs/sheets-ui";
import type { FUniver } from "@univerjs/presets";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { newCommentAnchorId } from "@ai-matrx/office/docs";
import { installSheetCommentAnchors, sheetCellName, type SheetAnchors } from "@ai-matrx/office/sheets/comment-anchors";

import { AnchoredCommentRail, type AnchoredCommentDraft } from "@/features/rich-document/annotations/AnchoredCommentRail";
import { useAnchoredComments } from "@/features/rich-document/annotations/useAnchoredComments";
import { toast } from "@/lib/toast";

const POLL_MS = 120;
export const ADD_CELL_COMMENT_COMMAND = "matrx.operation.add-comment";
export const TOGGLE_CELL_COMMENTS_COMMAND = "matrx.operation.toggle-comments";
const RAIL_KEY = "matrx.office.comment-rail";

type Box = { left: number; right: number; top: number; bottom: number };
type Injector = { get<T>(token: unknown): T };

interface WorkbookFacade {
  getId(): string;
  getActiveSheet(): {
    getSheetId(): string;
    getSheetName(): string;
    getSelection(): { getActiveRange(): { getRow(): number; getColumn(): number } | null } | null;
    getRange(row: number, col: number): { getValue(): unknown };
  };
  getSheetBySheetId?(id: string): { getSheetName(): string } | null;
}

function injectorOf(univer: Univer | null): Injector | null {
  return (univer as unknown as { __getInjector?: () => Injector } | null)?.__getInjector?.() ?? null;
}

/** A cell's box on screen (client coordinates), the way Univer's own cell popups place themselves. */
function cellBox(injector: Injector, unitId: string, row: number, col: number): Box | null {
  const render = injector.get<{ getRenderById?: (id: string) => unknown }>(IRenderManagerService).getRenderById?.(unitId) as
    | { scene: { getAncestorScale(): { scaleX: number; scaleY: number }; getViewport(key: string): { viewportScrollX: number; viewportScrollY: number } | null }; engine: { getCanvasElement(): HTMLCanvasElement | null }; with<T>(t: unknown): T }
    | undefined;
  if (!render) return null;
  const skeleton = render.with<{ getCurrentParam(): { skeleton?: { getCellWithCoordByIndex(r: number, c: number): { startX: number; startY: number; endX: number; endY: number; isMergedMainCell?: boolean; mergeInfo?: { startX: number; startY: number; endX: number; endY: number } } } } | null }>(SheetSkeletonManagerService).getCurrentParam()?.skeleton;
  const viewport = render.scene.getViewport("viewMain");
  const canvas = render.engine.getCanvasElement();
  if (!skeleton || !viewport || !canvas) return null;
  const p = skeleton.getCellWithCoordByIndex(row, col);
  const cell = p.isMergedMainCell && p.mergeInfo ? p.mergeInfo : p;
  const { scaleX, scaleY } = render.scene.getAncestorScale();
  const rect = canvas.getBoundingClientRect();
  const styleWidth = parseFloat(canvas.style.width) || rect.width;
  const k = rect.width / styleWidth;
  return {
    left: (cell.startX - viewport.viewportScrollX) * k * scaleX + rect.left,
    right: (cell.endX - viewport.viewportScrollX) * k * scaleX + rect.left,
    top: (cell.startY - viewport.viewportScrollY) * k * scaleY + rect.top,
    bottom: (cell.endY - viewport.viewportScrollY) * k * scaleY + rect.top,
  };
}

export interface SheetComments {
  layer: ReactNode;
  rail: ReactNode;
  open: boolean;
  toggle: () => void;
}

export function useSheetComments({
  univer,
  api,
  workbookId,
  ready,
  editable,
  wrapperRef,
}: {
  univer: Univer | null;
  api: FUniver | null;
  workbookId: string;
  ready: boolean;
  editable: boolean;
  wrapperRef: RefObject<HTMLElement | null>;
}): SheetComments {
  const href = `/workbooks/${workbookId}`;
  const comments = useAnchoredComments("workbook", workbookId, href, ready);
  const [anchors, setAnchors] = useState<SheetAnchors>({});
  const [boxes, setBoxes] = useState<Map<string, Box>>(new Map());
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).get("comment")) return true;
    const kept = window.localStorage.getItem(RAIL_KEY);
    return kept ? kept === "open" : window.matchMedia("(min-width: 1280px)").matches;
  });
  const [active, setActive] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("comment")));
  const [draft, setDraft] = useState<AnchoredCommentDraft | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const workbook = () => (api as unknown as { getActiveWorkbook(): WorkbookFacade | null } | null)?.getActiveWorkbook() ?? null;
  const handle = () => (univer ? installSheetCommentAnchors(univer) : null);

  const setRail = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(RAIL_KEY, next ? "open" : "closed");
    } catch {
      /* private mode */
    }
  };

  // Anchors: read on every change the anchor service reports (set, moved, removed, loaded).
  useEffect(() => {
    const h = handle();
    const wb = workbook();
    if (!h || !wb || !ready) return undefined;
    const unitId = wb.getId();
    setAnchors(h.get(unitId));
    return h.onChange((u) => {
      if (u === unitId) setAnchors(h.get(unitId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- per Univer instance
  }, [univer, api, ready]);

  const addComment = () => {
    if (!editable) {
      toast.error("You can comment once you can edit this workbook.");
      return;
    }
    const wb = workbook();
    const h = handle();
    const sheet = wb?.getActiveSheet();
    const range = sheet?.getSelection()?.getActiveRange();
    if (!wb || !h || !sheet || !range) {
      toast.error("Select the cell you want to comment on.");
      return;
    }
    if (draftRef.current) cancelDraft();
    const anchorId = newCommentAnchorId();
    const cell = { row: range.getRow(), col: range.getColumn() };
    if (!h.set({ unitId: wb.getId(), subUnitId: sheet.getSheetId(), anchorId, cell })) {
      toast.error("We couldn't anchor a comment to that cell.");
      return;
    }
    const value = sheet.getRange(cell.row, cell.col).getValue();
    const text = value == null ? "" : String(value);
    setRail(true);
    setActive(null);
    setDraft({ anchorId, quote: text ? `${sheetCellName(cell)}: ${text}` : sheetCellName(cell) });
  };

  const cancelDraft = () => {
    const d = draftRef.current;
    setDraft(null);
    const wb = workbook();
    const h = handle();
    if (!d || !wb || !h) return;
    const where = Object.entries(h.get(wb.getId())).find(([, ids]) => ids[d.anchorId]);
    if (where) h.set({ unitId: wb.getId(), subUnitId: where[0], anchorId: d.anchorId, cell: null });
  };

  // Selecting a commented cell opens its thread (read by the poll below).
  const openByAnchorRef = useRef(new Map<string, string>());
  const lastCell = useRef("");
  const handlers = useRef({ addComment, toggle: () => setRail(!open) });
  handlers.current = { addComment, toggle: () => setRail(!open) };

  useEffect(() => {
    const injector = injectorOf(univer);
    if (!injector || !ready) return undefined;
    const cs = injector.get<{ registerCommand(c: unknown): { dispose(): void }; hasCommand?(id: string): boolean }>(ICommandService);
    const disposables: Array<{ dispose(): void }> = [];
    for (const [id, run] of [
      [ADD_CELL_COMMENT_COMMAND, () => handlers.current.addComment()],
      [TOGGLE_CELL_COMMENTS_COMMAND, () => handlers.current.toggle()],
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

  // Cell boxes of the sheet on screen, polled (scroll, zoom, resize all move them; the canvas says nothing).
  useEffect(() => {
    const injector = injectorOf(univer);
    if (!injector || !ready) return undefined;
    const tick = () => {
      const wb = workbook();
      if (!wb) return;
      const sid = wb.getActiveSheet().getSheetId();
      setSheetId((prev) => (prev === sid ? prev : sid));
      const sel = wb.getActiveSheet().getSelection()?.getActiveRange();
      const here = sel ? `${sid}:${sel.getRow()}:${sel.getColumn()}` : "";
      if (here !== lastCell.current) {
        lastCell.current = here;
        const ids = handle()?.get(wb.getId())[sid] ?? {};
        const hit = Object.entries(ids).find(([, c]) => sel && c.row === sel.getRow() && c.col === sel.getColumn());
        const thread = hit ? openByAnchorRef.current.get(hit[0]) : undefined;
        if (thread) setActive(thread);
      }
      const next = new Map<string, Box>();
      const all = handle()?.get(wb.getId()) ?? {};
      for (const [anchorId, cell] of Object.entries(all[sid] ?? {})) {
        try {
          const b = cellBox(injector, wb.getId(), cell.row, cell.col);
          if (b) next.set(anchorId, b);
        } catch {
          /* layout not ready */
        }
      }
      setBoxes((prev) => (JSON.stringify([...prev].map(([k, b]) => [k, Math.round(b.left), Math.round(b.top)])) === JSON.stringify([...next].map(([k, b]) => [k, Math.round(b.left), Math.round(b.top)])) ? prev : next));
    };
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- per Univer instance
  }, [univer, api, ready]);

  // Where each anchor is now: sheet + cell name ("B6"); and whether it is still in the workbook.
  const cellOf = new Map<string, { sheet: string; name: string }>();
  for (const [sheet, ids] of Object.entries(anchors)) for (const [id, cell] of Object.entries(ids)) cellOf.set(id, { sheet, name: sheetCellName(cell) });
  const sheetName = (id: string) => workbook()?.getSheetBySheetId?.(id)?.getSheetName() ?? "";
  const liveLabel = (anchorId: string) => {
    const at = cellOf.get(anchorId);
    if (!at) return null;
    return at.sheet === sheetId ? at.name : `${sheetName(at.sheet)}!${at.name}`;
  };

  const openByAnchor = new Map(comments.threads.filter((t) => t.anchorId && !t.resolvedAt).map((t) => [t.anchorId!, t.id]));
  openByAnchorRef.current = openByAnchor;
  const activeAnchor = comments.threads.find((t) => t.id === active)?.anchorId ?? null;
  const origin = wrapperRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };

  const layer = (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" data-comment-cells="">
      {[...boxes].map(([anchorId, b]) =>
        openByAnchor.has(anchorId) || anchorId === draft?.anchorId ? (
          <div
            key={anchorId}
            data-comment-anchor={anchorId}
            className={anchorId === activeAnchor || anchorId === draft?.anchorId ? "absolute border-2 border-amber-500" : "absolute"}
            style={{ left: b.left - origin.left, top: b.top - origin.top, width: b.right - b.left, height: b.bottom - b.top }}
          >
            <span className="absolute right-0 top-0 size-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-amber-500" />
          </div>
        ) : null,
      )}
    </div>
  );

  const anchorTops = new Map<string, number>();
  for (const [id, b] of boxes) anchorTops.set(id, b.top);

  const rail = open ? (
    <AnchoredCommentRail
      source={{ token: "workbook", id: workbookId, title: "", body: "", contentVersion: 0, href }}
      comments={comments}
      anchorTops={anchorTops}
      present={new Set(cellOf.keys())}
      liveLabel={liveLabel}
      removedLabel="Cell removed"
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
