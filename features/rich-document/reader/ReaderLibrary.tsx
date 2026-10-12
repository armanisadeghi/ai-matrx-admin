"use client";

// features/rich-document/reader/ReaderLibrary.tsx
//
// The big picture of a set of documents in ONE outline: every document is a
// top-level entry (its own title), grouped ("Topic report", "Keyword
// syntheses"); the open one unfolds into its sections — the same
// DocumentOutline the study guide uses — and any other is one click away.
// Nothing but titles: status, versions and dates live in the reader's Details.

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SearchField } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { DocumentOutline } from "@/features/rich-document/outline/DocumentOutline";

export interface ReaderLibraryItem {
  id: string;
  title: string;
  /** Markdown body (its headings become the open document's outline). */
  content: string;
  /** A short word only when something is wrong ("Failed", "Empty") — never status noise. */
  flag?: string;
}

export interface ReaderLibraryGroup {
  label: string;
  items: ReaderLibraryItem[];
}

/** Search appears once a library is long enough to need it. */
const SEARCH_FROM = 9;

export function ReaderLibrary({
  groups,
  activeId,
  onSelect,
  onJump,
  label = "Documents",
}: {
  groups: readonly ReaderLibraryGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Jump inside the OPEN document (-1 = its top). */
  onJump: (headingIndex: number) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const q = query.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, items: q ? g.items.filter((i) => i.title.toLowerCase().includes(q)) : g.items }))
    .filter((g) => g.items.length > 0);
  const single = groups.length === 1;

  return (
    <nav aria-label={label} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {total >= SEARCH_FROM && (
        <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a document" aria-label="Find a document" />
      )}
      {shown.map((group) => (
        <section key={group.label} className="min-w-0">
          {!single && <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>}
          <ul className="grid list-none grid-cols-[minmax(0,1fr)] gap-0.5 p-0">
            {group.items.map((item) => {
              const open = item.id === activeId;
              return (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    aria-current={open ? "true" : undefined}
                    title={item.title}
                    onClick={() => (open ? onJump(-1) : onSelect(item.id))}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-1 rounded-md px-1.5 py-1.5 text-left text-xs leading-snug hover:bg-accent",
                      open ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {open ? <ChevronDown className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> : <ChevronRight className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />}
                    <span className="line-clamp-2 min-w-0 flex-1">{item.title}</span>
                    {item.flag && <span className="shrink-0 text-[11px] font-normal text-destructive-ink">{item.flag}</span>}
                  </button>
                  {open && item.content && (
                    <div className="ml-3 border-l border-border/70 pb-1">
                      <DocumentOutline key={`${item.id}:${item.content.length}`} content={item.content} titleLabel={item.title} onJump={onJump} sections="all" showTitle={false} label={`${item.title} outline`} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {q && shown.length === 0 && <p className="px-2 text-xs text-muted-foreground">No document matches.</p>}
    </nav>
  );
}

/** A document's display title: its own first heading, minus a generic "…Synthesis:" lead-in. */
export function documentTitleOf(content: string | null | undefined, fallback: string): string {
  const h1 = /^\s*#\s+(.+)$/m.exec(content ?? "")?.[1]?.trim();
  if (!h1) return fallback;
  const cleaned = h1.replace(/^(keyword\s+)?(research\s+)?(synthesis|report)\s*[:—–-]\s*/i, "").trim();
  return cleaned || h1;
}
