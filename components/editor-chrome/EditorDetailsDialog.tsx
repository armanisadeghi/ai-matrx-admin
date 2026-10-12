"use client";

/**
 * File → Details: a short read-only table of facts about the open file (when it was made, last
 * edited, where it came from, how big it is). Rows are `[label, value]` pairs the host supplies;
 * an empty value is dropped.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type EditorDetailRow = [label: string, value: string | null | undefined];

export function formatDetailDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function EditorDetailsDialog({
  open,
  onOpenChange,
  title,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: EditorDetailRow[];
}) {
  const shown = rows.filter((r): r is [string, string] => !!r[1]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-editor-details="">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
          {shown.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
