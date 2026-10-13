"use client";

/**
 * A JSON value kept in a table cell, drawn as ONE compact line (what it is, then the start of it)
 * that opens its pretty-printed form on click. Never markdown, never math: review text carrying
 * "$12 $34" once ran through KaTeX and drew italics, one character per line.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";

/** The parsed value when the text is a JSON object or array; null for anything else (plain text, numbers, quotes). */
export function parseJsonCell(text: string): unknown | null {
  const t = text.trim();
  if (t.length < 2 || !((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]")))) return null;
  try {
    const value: unknown = JSON.parse(t);
    return value !== null && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function summaryOf(value: unknown): string {
  if (Array.isArray(value)) return value.length === 1 ? "1 item" : `${value.length} items`;
  const n = Object.keys(value as object).length;
  return n === 1 ? "1 field" : `${n} fields`;
}

export function JsonCellPreview({ value }: { value: unknown }) {
  const compact = JSON.stringify(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 max-w-full items-center gap-1.5 text-left text-sm hover:underline"
          data-records-json-cell=""
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open the full value (${summaryOf(value)})`}
        >
          <span className="shrink-0 rounded bg-muted px-1 text-xs text-muted-foreground">{summaryOf(value)}</span>
          <span className="min-w-0 truncate font-mono text-xs" data-records-json-cell-line="">{compact}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-[min(32rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs" data-records-json-cell-full="">
          {JSON.stringify(value, null, 2)}
        </pre>
      </PopoverContent>
    </Popover>
  );
}
