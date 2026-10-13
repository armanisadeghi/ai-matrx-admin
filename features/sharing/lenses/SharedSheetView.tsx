"use client";

/**
 * A shared workbook as a read-only spreadsheet: lettered columns, numbered rows, the sheet's own
 * number/date formats, checkboxes drawn as checkboxes, fills and bold, the header rows the owner
 * froze staying put while the rest scrolls, and a tab per sheet that has something in it. It scrolls
 * inside its own frame, so it holds at phone width. The model is `snapshotToGridSheets`.
 */

import { useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { Tabs } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { GRID_MAX_ROWS, type GridCell, type GridSheet } from "@/features/workbooks/snapshot-grid";

const HEAD_H = 24;
/** Row-number column: fits at least 4 digits on one line (11px tabular digits ~7px each + padding). */
const ROW_HEAD_MIN_DIGITS = 4;
function rowHeadWidth(rowCount: number): number {
  const digits = Math.max(ROW_HEAD_MIN_DIGITS, String(Math.max(rowCount, 1)).length);
  return digits * 8 + 14;
}

function columnLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function CellBody({ cell }: { cell: GridCell }) {
  if (cell.checkbox) {
    return (
      <span
        role="checkbox"
        aria-checked={cell.checkbox.checked}
        aria-readonly="true"
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-[3px] border align-middle",
          cell.checkbox.checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/70 bg-card",
        )}
      >
        {cell.checkbox.checked ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
      </span>
    );
  }
  return <>{cell.text}</>;
}

function SheetGrid({ sheet }: { sheet: GridSheet }) {
  const left: number[] = [];
  const ROW_HEAD_W = rowHeadWidth(sheet.rows.length ? sheet.rows[sheet.rows.length - 1].index + 1 : 1);
  let x = ROW_HEAD_W;
  for (const col of sheet.columns) {
    left.push(x);
    x += col.width;
  }
  const top: number[] = [];
  let y = HEAD_H;
  for (const row of sheet.rows) {
    top.push(y);
    y += row.height;
  }
  const line = sheet.gridlines ? "border-b border-r border-border" : "";
  const headBase = "bg-muted text-center text-[11px] font-normal text-muted-foreground border-b border-r border-border";

  return (
    <table className="border-separate border-spacing-0 text-[13px] text-foreground" style={{ width: x, maxWidth: "none", display: "table", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: ROW_HEAD_W }} />
        {sheet.columns.map((c) => (
          <col key={c.index} style={{ width: c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr style={{ height: HEAD_H }}>
          <th scope="col" className={cn(headBase, "sticky left-0 top-0 z-30")} aria-label="Corner" />
          {sheet.columns.map((c, i) => (
            <th
              key={c.index}
              scope="col"
              className={cn(headBase, "sticky top-0", i < sheet.frozenColumns ? "z-20" : "z-10")}
              style={i < sheet.frozenColumns ? { left: left[i] } : undefined}
            >
              {columnLetter(c.index)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sheet.rows.map((row, r) => {
          const frozenRow = r < sheet.frozenRows;
          return (
            <tr key={row.index} style={{ height: row.height }}>
              <th
                scope="row"
                className={cn(headBase, "sticky left-0 whitespace-nowrap tabular-nums", frozenRow ? "z-20" : "z-10")}
                style={frozenRow ? { top: top[r] } : undefined}
              >
                {row.index + 1}
              </th>
              {row.cells.map((cell, i) => {
                if (cell.covered) return null;
                const frozenCol = i < sheet.frozenColumns;
                const style: CSSProperties = {
                  height: row.height,
                  textAlign: cell.align,
                  fontSize: cell.fontPx,
                  background: cell.bg,
                  color: cell.color,
                  left: frozenCol ? left[i] : undefined,
                  top: frozenRow ? top[r] : undefined,
                };
                const sticky = frozenRow || frozenCol;
                return (
                  <td
                    key={sheet.columns[i].index}
                    rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                    className={cn(
                      line,
                      "px-1.5 align-middle",
                      cell.wrap ? "whitespace-normal break-words" : "overflow-hidden text-ellipsis whitespace-nowrap",
                      cell.bold && "font-semibold",
                      cell.italic && "italic",
                      sticky && "sticky",
                      sticky && !cell.bg && "bg-card",
                      frozenRow && frozenCol ? "z-[15]" : sticky ? "z-[5]" : undefined,
                    )}
                    style={style}
                  >
                    <CellBody cell={cell} />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function SharedSheetView({ sheets }: { sheets: GridSheet[] }) {
  const [active, setActive] = useState(sheets[0]?.id ?? "");
  const sheet = sheets.find((s) => s.id === active) ?? sheets[0];
  if (!sheet) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="max-h-[70dvh] overflow-auto scrollbar-thin" tabIndex={0} role="region" aria-label={sheet.name}>
        <SheetGrid key={sheet.id} sheet={sheet} />
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-muted/50 px-2">
        <Tabs
          aria-label="Sheets"
          value={sheet.id}
          onValueChange={setActive}
          data={sheets.map((s) => ({ value: s.id, label: s.name }))}
          rule={false}
          className="min-w-0 flex-1"
        />
        {sheet.truncatedFrom !== null ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            First {GRID_MAX_ROWS} of {sheet.truncatedFrom} rows
          </span>
        ) : null}
      </div>
    </div>
  );
}
