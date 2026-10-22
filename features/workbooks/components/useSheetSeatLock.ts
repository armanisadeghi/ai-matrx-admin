"use client";

/**
 * A Sheets seat without edit access is locked (`sheetSeatLock`) and told so in plain words when it tries to change a cell.
 * A seat that may comment is told it can comment; a seat that may only look is told that. Same words as Docs (`seat-notices`).
 */
import type { Univer } from "@univerjs/core";
import { useEffect } from "react";

import { useCommentAccess } from "@/features/rich-document/annotations/useCommentAccess";
import { seatRefusal } from "@/lib/collab/seat-notices";
import { toast } from "@/lib/toast";
import { currentSheetUnitId, lockWorkbookSeat } from "@/features/workbooks/components/sheetSeatLock";

export function useSheetSeatLock({ univer, workbookId, ready, editable }: { univer: Univer | null; workbookId: string; ready: boolean; editable: boolean }): void {
  const mayComment = useCommentAccess("workbook", workbookId, editable);
  useEffect(() => {
    if (!univer || !ready || editable) return undefined;
    const injector = (univer as unknown as { __getInjector?: () => { get<T>(t: unknown): T } }).__getInjector?.();
    const unitId = injector ? currentSheetUnitId(injector) : null;
    if (!injector || !unitId) return undefined;
    const refusal = seatRefusal(mayComment, "spreadsheet");
    return lockWorkbookSeat(injector, unitId, () => toast.info(refusal, { id: "sheet-seat-locked" }));
  }, [univer, ready, editable, mayComment]);
}
