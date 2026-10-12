"use client";

/**
 * <RecordThumb kind id stamp /> — a recent file's real first page (document) or first sheet
 * (workbook), drawn from a small server-cut slice of its latest snapshot (`useRecordPreview`).
 * Never a generic icon: a file with no saved content shows its true blank page / empty grid.
 *
 * The page is paper — white with dark ink in both themes, exactly as the template tiles beside it
 * and Google's own thumbnails draw it; it depicts the file, not the app chrome.
 *
 * Sizes are container units (`cqw`), so the same drawing fills a 208px desktop card or a 40px
 * phone row icon without measuring anything in JavaScript.
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import {
  useRecordPreview,
  type DocPreview,
  type PreviewKind,
  type SheetPreview,
  type SheetPreviewCell,
} from "./useRecordPreview";

// ---- documents --------------------------------------------------------------------------------

type DocLevel = "title" | "subtitle" | "h1" | "h2" | "h3" | "body";
export interface DocLine {
  text: string;
  level: DocLevel;
  align: "left" | "center" | "right";
  bullet: "bullet" | "number" | null;
}

const NAMED: Record<string, DocLevel> = {
  "2": "title",
  TITLE: "title",
  "3": "subtitle",
  SUBTITLE: "subtitle",
  "4": "h1",
  HEADING_1: "h1",
  "5": "h2",
  HEADING_2: "h2",
  "6": "h3",
  HEADING_3: "h3",
  "7": "h3",
  HEADING_4: "h3",
  "8": "h3",
  HEADING_5: "h3",
};

/** The first lines of a document as a reader would see them (PURE). */
export function docLines(preview: DocPreview, max = 40): DocLine[] {
  const stream = preview.text ?? "";
  const byEnd = new Map((preview.paras ?? []).map((p) => [p.i, p]));
  const out: DocLine[] = [];
  let buf = "";
  let number = 0;
  const close = (end: number | null) => {
    const p = end === null ? undefined : byEnd.get(end);
    const level = (p?.n !== undefined ? NAMED[String(p.n)] : undefined) ?? "body";
    const bullet = p?.l ? (p.l.includes("ORDER") ? "number" : "bullet") : null;
    number = bullet === "number" ? number + 1 : 0;
    const text = buf.replace(/\s+/g, " ").trim();
    out.push({
      text: bullet === "number" ? `${number}. ${text}` : text,
      level,
      align: p?.a === 2 ? "center" : p?.a === 3 ? "right" : "left",
      bullet,
    });
    buf = "";
  };
  for (let i = 0; i < stream.length && out.length < max; i += 1) {
    const ch = stream[i]!;
    if (ch === "\r") close(i);
    else if (ch === "\n") continue;
    else if (ch.charCodeAt(0) < 32) buf += " "; // table / link / block control tokens
    else buf += ch;
  }
  if (buf.trim() && out.length < max) close(null);
  // A table's cells end in their own paragraphs; drop the empty ones the controls leave behind
  // after real text, but keep a document's intentional leading blank lines short.
  return out.filter((l, i) => l.text !== "" || (i > 0 && out[i - 1]!.text !== ""));
}

const DOC_STYLE: Record<DocLevel, CSSProperties> = {
  title: { fontSize: "7cqw", fontWeight: 400, lineHeight: 1.2, marginBottom: "1.5cqw" },
  subtitle: { fontSize: "4.4cqw", lineHeight: 1.25, marginBottom: "1.5cqw", opacity: 0.7 },
  h1: { fontSize: "5.2cqw", fontWeight: 500, lineHeight: 1.25, margin: "2cqw 0 1cqw" },
  h2: { fontSize: "4.2cqw", fontWeight: 500, lineHeight: 1.25, margin: "1.6cqw 0 0.8cqw" },
  h3: { fontSize: "3.6cqw", fontWeight: 600, lineHeight: 1.3, margin: "1.2cqw 0 0.6cqw" },
  body: { fontSize: "2.9cqw", lineHeight: 1.45 },
};

function DocPage({ preview }: { preview: DocPreview }) {
  const lines = docLines(preview);
  return (
    <div className="h-full w-full overflow-hidden bg-white text-zinc-900" style={{ padding: "9cqw 10cqw" }}>
      {lines.map((l, i) => (
        <p
          key={i}
          className="overflow-hidden break-words"
          style={{
            ...DOC_STYLE[l.level],
            textAlign: l.align,
            ...(l.bullet === "bullet" ? { paddingLeft: "4cqw" } : {}),
            ...(l.text === "" ? { height: "2.9cqw" } : {}),
          }}
        >
          {l.bullet === "bullet" ? "• " : null}
          {l.text}
        </p>
      ))}
    </div>
  );
}

// ---- workbooks --------------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** One cell's shown text, through the common number formats (PURE). */
export function sheetCellText(cell: SheetPreviewCell | undefined): string {
  const v = cell?.v;
  if (v === null || v === undefined) return "";
  if (typeof v !== "number") return String(v);
  const pattern = (cell?.n ?? "").replace(/"[^"]*"/g, "");
  const lower = pattern.toLowerCase();
  if (/[dy]/.test(lower)) {
    const d = new Date(Math.round(SERIAL_EPOCH_MS + v * DAY_MS));
    return d.toLocaleDateString(undefined, { timeZone: "UTC", month: "numeric", day: "numeric", year: "numeric" });
  }
  const decimals = /0\.(0+)/.exec(pattern)?.[1]?.length ?? (pattern.trim() || Number.isInteger(v) ? 0 : 2);
  if (pattern.includes("%")) return `${(v * 100).toFixed(decimals)}%`;
  const grouped = v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const currency = /[$€£¥]/.exec(pattern)?.[0];
  return currency ? `${currency}${grouped}` : grouped;
}

/** The virtual sheet width the thumbnail shows (Univer px); columns past it are cut, like Google. */
const VIRTUAL_WIDTH = 400;
const ROW_PX = 22;
const ROWS = 30;

function SheetGrid({ preview }: { preview: SheetPreview }) {
  const base = preview.defaultWidth && preview.defaultWidth > 20 ? preview.defaultWidth : 88;
  const cols: Array<{ c: number; w: number }> = [];
  let used = 0;
  for (let c = 0; c < 12 && used < VIRTUAL_WIDTH; c += 1) {
    const meta = preview.cols?.[String(c)];
    if (meta?.h) continue; // hidden (a table link's Record ID column)
    const w = meta?.w && meta.w > 4 ? meta.w : base;
    cols.push({ c, w });
    used += w;
  }
  const unit = 100 / VIRTUAL_WIDTH; // cqw per virtual px
  return (
    <div className="h-full w-full overflow-hidden bg-white text-zinc-900">
      <table className="border-collapse" style={{ tableLayout: "fixed", width: `${used * unit}cqw`, fontSize: `${11 * unit}cqw` }}>
        <colgroup>
          {cols.map(({ c, w }) => (
            <col key={c} style={{ width: `${w * unit}cqw` }} />
          ))}
        </colgroup>
        <tbody>
          {Array.from({ length: ROWS }, (_, r) => {
            const row = preview.cells?.[String(r)];
            return (
              <tr key={r} style={{ height: `${ROW_PX * unit}cqw` }}>
                {cols.map(({ c }) => {
                  const cell = row?.[String(c)];
                  const text = sheetCellText(cell);
                  const numeric = typeof cell?.v === "number";
                  const align = cell?.ht === 2 ? "center" : cell?.ht === 3 || (numeric && cell?.ht !== 1) ? "right" : "left";
                  return (
                    <td
                      key={c}
                      className="overflow-hidden whitespace-nowrap border border-zinc-200"
                      style={{
                        padding: `0 ${3 * unit}cqw`,
                        textAlign: align,
                        fontWeight: cell?.b ? 600 : undefined,
                        // A cell's own colours are the sheet's content, shown as the author set them.
                        ...(cell?.bg ? { backgroundColor: cell.bg } : {}),
                        ...(cell?.cl ? { color: cell.cl } : {}),
                      }}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- the tile ---------------------------------------------------------------------------------

function Skeleton({ kind }: { kind: PreviewKind }) {
  return (
    <div className="h-full w-full animate-pulse bg-white" aria-hidden style={{ padding: kind === "document" ? "9cqw 10cqw" : "0" }}>
      {kind === "document" ? (
        <div className="flex flex-col" style={{ gap: "3cqw" }}>
          <div className="rounded-sm bg-zinc-200" style={{ height: "4cqw", width: "60%" }} />
          {[92, 100, 84, 96, 70].map((w) => (
            <div key={w} className="rounded-sm bg-zinc-200" style={{ height: "2.4cqw", width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="grid h-full grid-cols-5">
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} className="border border-zinc-200" style={{ height: "4cqw" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RecordThumb({
  kind,
  id,
  stamp,
  className,
  overlay,
}: {
  kind: PreviewKind;
  id: string;
  /** The record's `updated_at` — a new value redraws the preview. */
  stamp: string;
  className?: string;
  /** Small badges laid over the preview's corner. */
  overlay?: ReactNode;
}) {
  const { ref, entry } = useRecordPreview(kind, id, stamp);
  return (
    <div ref={ref} className={cn("@container relative overflow-hidden", className)} data-record-thumb={kind}>
      {entry.state === "loading" ? <Skeleton kind={kind} /> : null}
      {entry.state === "ready" ? (
        kind === "document" ? <DocPage preview={entry.preview as DocPreview} /> : <SheetGrid preview={entry.preview as SheetPreview} />
      ) : null}
      {entry.state === "empty" ? (
        kind === "document" ? <DocPage preview={{}} /> : <SheetGrid preview={{}} />
      ) : null}
      {entry.state === "error" ? (
        <div className="flex h-full w-full items-center justify-center gap-1 bg-white px-2 text-center text-xs text-zinc-500">
          Preview unavailable
          <ErrorAlchemyMenu error={entry.error} />
        </div>
      ) : null}
      {overlay}
    </div>
  );
}
