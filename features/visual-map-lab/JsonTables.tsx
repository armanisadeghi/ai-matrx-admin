"use client";

// features/visual-map-lab/JsonTables.tsx — any JSON as readable tables, plus the raw JSON with one-click copy.
// Scalars become a name/value table, a list of objects becomes a table, anything deeper stays as raw JSON.

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { cn } from "@/lib/utils";

const MAX_COLUMNS = 7;
const cell = (v: unknown): string =>
  v == null ? "" : typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);

export function DataTable({ rows, columns, className }: { rows: Array<Record<string, unknown>>; columns?: string[]; className?: string }) {
  const cols = useMemo(() => {
    if (columns) return columns;
    const seen: string[] = [];
    for (const row of rows) for (const key of Object.keys(row)) if (!seen.includes(key)) seen.push(key);
    return seen.slice(0, MAX_COLUMNS);
  }, [rows, columns]);
  return (
    <div className={cn("overflow-auto rounded-md border border-border", className)}>
      <table className="w-full border-collapse text-left type-secondary">
        <thead className="bg-muted/50">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap border-b border-border px-2 py-1 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0 align-top">
              {cols.map((c) => (
                <td key={c} className="max-w-[28rem] break-words px-2 py-1">{cell(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RawJson({ value, label }: { value: unknown; label: string }) {
  const text = useMemo(() => (typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? "")), [value]);
  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-2 py-1">
        <span className="type-secondary font-medium">{typeof value === "string" ? label : `${label} JSON`}</span>
        <Button variant="quiet" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => void copyToClipboard(text, `Copied ${label}`)} aria-label={`Copy ${label} JSON`}>
          Copy
        </Button>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-2 text-xs leading-snug">{text}</pre>
    </div>
  );
}

const isObj = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);
const isRows = (v: unknown): v is Array<Record<string, unknown>> => Array.isArray(v) && v.length > 0 && v.every(isObj);

/** The value's top level as tables; the full raw JSON follows. */
export function JsonTables({ value, label }: { value: unknown; label: string }) {
  if (value == null) return <span className="type-secondary text-muted-foreground">None</span>;
  const scalars: Array<Record<string, unknown>> = [];
  const lists: Array<[string, Array<Record<string, unknown>>]> = [];
  if (isRows(value)) lists.push([label, value]);
  else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (isRows(v)) lists.push([k, v]);
      else if (v == null || typeof v !== "object") scalars.push({ name: k, value: v });
      else if (Array.isArray(v)) scalars.push({ name: k, value: v.map(cell).join(", ") });
      else scalars.push({ name: k, value: JSON.stringify(v) });
    }
  } else scalars.push({ name: label, value });
  return (
    <div className="flex flex-col gap-3">
      {scalars.length > 0 && <DataTable rows={scalars} columns={["name", "value"]} />}
      {lists.map(([name, rows]) => (
        <div key={name} className="flex flex-col gap-1">
          <span className="type-secondary font-medium">{name} · {rows.length}</span>
          <DataTable rows={rows} />
        </div>
      ))}
      <RawJson value={value} label={label} />
    </div>
  );
}
