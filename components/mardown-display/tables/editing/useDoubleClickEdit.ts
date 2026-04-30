import { useRef } from "react";

/**
 * Mode controlled by the host component:
 *  - "none"      → not editing
 *  - "header"    → editing the header row
 *  - rowIndex N  → editing body row N (cells are textareas)
 */
export type TableEditMode = "none" | "header" | number;

interface UseDoubleClickEditArgs {
  /**
   * Same gate as the visible "Edit" button. When false the hook is a no-op
   * (e.g. while the table is streaming or otherwise locked).
   */
  canEnterEditMode: boolean;
  editMode: TableEditMode;
  setEditMode: (mode: TableEditMode) => void;
}

/**
 * Double-click anywhere on the table → enters edit mode (when allowed) and
 * focuses the specific cell that was double-clicked. Implementation notes:
 *
 * 1. We attach `onDoubleClick` at the `<table>` level and identify the target
 *    cell via `data-cell-*` attributes on `<td>` / `<th>`. This avoids per-cell
 *    handlers and plays nicely with cell content that uses
 *    `dangerouslySetInnerHTML` (the inner span is the event target — closest()
 *    finds the cell ancestor cleanly).
 *
 * 2. We skip targets inside `input, textarea, button` so:
 *    - already-rendered textareas still get native double-click word selection,
 *    - row/column action menu triggers keep their normal click behavior.
 *
 * 3. Focus pipeline:
 *    - If the row is already in edit mode, the matching `<textarea>` is
 *      already mounted — we focus it directly.
 *    - Otherwise we stash `{row, col}` in `pendingFocusRef`, flip edit mode,
 *      and rely on the textarea ref callback (registered via
 *      `bindCellTextareaRef`) to consume the pending target on its first
 *      render and focus + select itself.
 */
export function useDoubleClickEdit({
  canEnterEditMode,
  editMode,
  setEditMode,
}: UseDoubleClickEditArgs) {
  const pendingFocusRef = useRef<{ row: number; col: number } | null>(null);

  const handleTableDoubleClick = (e: React.MouseEvent<HTMLTableElement>) => {
    if (!canEnterEditMode) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Don't hijack double-clicks on form controls or buttons:
    //   • <textarea>/<input>: native word-selection should still work for the
    //     cell that's already in edit mode.
    //   • <button>: row/column action menu triggers keep their normal flow.
    if (target.closest("input, textarea, button")) return;

    const cell = target.closest<HTMLElement>("[data-cell]");
    if (!cell) return;

    const kind = cell.dataset.cell;

    if (kind === "header") {
      if (editMode !== "header") setEditMode("header");
      return;
    }

    if (kind === "body") {
      const row = Number(cell.dataset.cellRow);
      const col = Number(cell.dataset.cellCol);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      // Same row already being edited → just shift focus inside the row.
      if (editMode === row) {
        const textarea = cell.querySelector("textarea");
        if (textarea) {
          textarea.focus();
          textarea.select();
        }
        return;
      }

      // Otherwise: queue focus for the cell that's about to mount.
      pendingFocusRef.current = { row, col };
      setEditMode(row);
    }
  };

  /**
   * Ref callback factory for cell textareas. Produces a stable-shaped
   * function that focuses the textarea once when its (row, col) matches the
   * pending target. Subsequent mounts/renders are no-ops because we clear
   * the pending target on first match.
   */
  const bindCellTextareaRef =
    (rowIndex: number, colIndex: number) =>
    (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      const pending = pendingFocusRef.current;
      if (!pending) return;
      if (pending.row !== rowIndex || pending.col !== colIndex) return;
      pendingFocusRef.current = null;
      // requestAnimationFrame: lets React finish committing before we focus,
      // avoiding a transient layout that can cancel the focus on some browsers.
      requestAnimationFrame(() => {
        el.focus();
        el.select();
      });
    };

  return { handleTableDoubleClick, bindCellTextareaRef };
}
