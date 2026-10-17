/**
 * Tools → Autocomplete. As in Google Sheets: while you type text into a cell, a value already in that
 * column that starts with what you typed is offered under the cell; Tab takes it. Enter and everything
 * else enter exactly what you typed, so "App" is still enterable beside "Apple".
 *
 * The suggestion rule is pure (`suggestCompletion`, tested); `installColumnAutocomplete` wires it to
 * Univer's cell-editing events and a small chip under the cell being edited.
 */

import { trimTrailingBlankRows } from "./sheet-extras";

/** The column value to offer for `typed`: text only, case-insensitive prefix, longer than what is typed; the most common one wins, then the first. */
export function suggestCompletion(typed: string, columnValues: unknown[]): string | null {
  const t = typed;
  if (t.trim() === "" || t.startsWith("=") || t.startsWith("'")) return null;
  const lower = t.toLowerCase();
  const counts = new Map<string, { n: number; first: number }>();
  columnValues.forEach((v, i) => {
    if (typeof v !== "string" || v.length <= t.length || !v.toLowerCase().startsWith(lower)) return;
    const hit = counts.get(v);
    if (hit) hit.n += 1;
    else counts.set(v, { n: 1, first: i });
  });
  let best: string | null = null;
  let bestN = 0;
  let bestFirst = 0;
  for (const [value, { n, first }] of counts) {
    if (n > bestN || (n === bestN && first < bestFirst)) {
      best = value;
      bestN = n;
      bestFirst = first;
    }
  }
  return best;
}

interface EditParams {
  row: number;
  column: number;
  worksheet: { getRange(row: number, col: number, rows: number, cols: number): { getValues(): unknown[][]; setValue(v: unknown): unknown; getCellRect?(): DOMRect }; getLastRow(): number };
  workbook: { abortEditingAsync(): Promise<boolean> };
  value?: { toPlainText?: () => string };
  keycode?: number;
  cancel?: boolean;
}
interface AutocompleteApi {
  addEvent(name: string, cb: (e: EditParams) => void): { dispose(): void };
  Event: { SheetEditStarted: string; SheetEditChanging: string; BeforeSheetEditEnd: string; SheetEditEnded: string };
}

const TAB = 9;

export function installColumnAutocomplete(api: AutocompleteApi, isEnabled: () => boolean): () => void {
  let column: string[] | null = null;
  let suggestion: string | null = null;
  let chip: HTMLElement | null = null;

  const hide = () => {
    suggestion = null;
    chip?.remove();
    chip = null;
  };
  const show = (text: string, rect: DOMRect | undefined) => {
    if (!chip) {
      chip = document.createElement("div");
      chip.setAttribute("data-sheet-autocomplete", "");
      chip.setAttribute("role", "status");
      chip.style.cssText =
        "position:fixed;z-index:2000;padding:2px 8px;font-size:12px;border-radius:6px;pointer-events:none;background:hsl(var(--popover,0 0% 100%));color:hsl(var(--popover-foreground,0 0% 7%));border:1px solid hsl(var(--border,0 0% 80%));box-shadow:0 2px 8px rgba(0,0,0,.2);white-space:nowrap";
      document.body.appendChild(chip);
    }
    chip.textContent = `${text}   Tab to accept`;
    if (rect) {
      // The cell rect is in the grid canvas's own coordinates.
      const grid = document.querySelector('canvas[id^="univer-sheet-main-canvas"]')?.getBoundingClientRect();
      chip.style.left = `${rect.left + (grid?.left ?? 0)}px`;
      chip.style.top = `${rect.bottom + (grid?.top ?? 0) + 2}px`;
    }
  };

  const disposers = [
    api.addEvent(api.Event.SheetEditStarted, (e) => {
      hide();
      try {
        const last = e.worksheet.getLastRow();
        const all = e.worksheet.getRange(0, e.column, last + 1, 1).getValues();
        // The cell being edited is not a source for itself.
        column = trimTrailingBlankRows(all).map((r, i) => (i === e.row ? "" : r[0])) as string[];
      } catch {
        column = null;
      }
    }),
    api.addEvent(api.Event.SheetEditChanging, (e) => {
      if (!isEnabled() || !column) return hide();
      const typed = e.value?.toPlainText?.() ?? "";
      const next = suggestCompletion(typed, column);
      if (!next) return hide();
      suggestion = next;
      let rect: DOMRect | undefined;
      try {
        rect = e.worksheet.getRange(e.row, e.column, 1, 1).getCellRect?.();
      } catch {
        rect = undefined;
      }
      show(next, rect);
    }),
    api.addEvent(api.Event.BeforeSheetEditEnd, (e) => {
      if (suggestion && e.keycode === TAB && isEnabled()) {
        const accepted = suggestion;
        e.cancel = true;
        hide();
        void e.workbook.abortEditingAsync().then(() => e.worksheet.getRange(e.row, e.column, 1, 1).setValue(accepted));
      }
    }),
    api.addEvent(api.Event.SheetEditEnded, () => {
      hide();
      column = null;
    }),
  ];
  return () => {
    hide();
    disposers.forEach((d) => d.dispose());
  };
}
