"use client";

// features/rich-document/reader/ReaderDetails.tsx
//
// A record's facts in the reader's Details tab: compact label/value rows (the
// label column as wide as its longest word, the value takes the rest), in
// titled sections. Only what helps — never status noise for the normal case.

import type { ReactNode } from "react";

export interface ReaderDetailRow {
  label: string;
  value: ReactNode;
}

export interface ReaderDetailSection {
  title?: string;
  rows: readonly (ReaderDetailRow | null | false | undefined | "" | 0)[];
}

export function ReaderDetails({ sections }: { sections: readonly ReaderDetailSection[] }) {
  return (
    <div className="grid gap-5">
      {sections.map((section, index) => {
        const rows = section.rows.filter(Boolean) as ReaderDetailRow[];
        if (!rows.length) return null;
        return (
          <section key={section.title ?? index} className="grid gap-2">
            {section.title && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>}
            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 break-words text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

/** "Aug 28, 2026, 11:51 AM" — one line. */
export function detailDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Unknown";
}
