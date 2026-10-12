"use client";

// features/rich-document/reader/ReaderLibrary.tsx
//
// The big picture of a set of documents in ONE outline: every document is a
// top-level entry (its own title), grouped ("Topic report", "Keyword
// syntheses"); the open one is marked and unfolds into its sections — the same
// DocumentOutline the study guide uses — and any other is one click away. A
// single document is a library of one, so every reader draws ONE outline.
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
const SEARCH_FROM = 6;

/** A title as a person reads it: trailing hashtags (video titles) dropped. */
export function readableTitle(title: string): string {
  return title.replace(/(\s+#[\p{L}\p{N}_]+)+\s*$/u, "").trim() || title;
}

/** A document's display title: its own first heading, minus a generic "…Synthesis:" lead-in. */
export function documentTitleOf(content: string | null | undefined, fallback: string): string {
  const h1 = /^\s*#\s+(.+)$/m.exec(content ?? "")?.[1]?.trim();
  if (!h1) return fallback;
  const cleaned = h1.replace(/^(keyword\s+)?(research\s+)?(synthesis|report)\s*[:—–-]\s*/i, "").trim();
  return cleaned || h1;
}

export function ReaderLibrary({
  groups,
  activeId,
  onSelect,
  onJump,
  summary,
  label = "Documents",
}: {
  groups: readonly ReaderLibraryGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Jump inside the OPEN document (-1 = its top). */
  onJump: (headingIndex: number) => void;
  /** One quiet line about the whole set ("1 report · 4 keyword syntheses"). */
  summary?: string;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  // The open document's sections can be folded away without leaving it.
  const [folded, setFolded] = useState<string | null>(null);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const q = query.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, items: q ? g.items.filter((i) => i.title.toLowerCase().includes(q)) : g.items }))
    .filter((g) => g.items.length > 0);
  const single = groups.length === 1;

  return (
    <nav aria-label={label} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {summary && <p className="px-2 text-[11px] text-muted-foreground">{summary}</p>}
      {total >= SEARCH_FROM && (
        <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a document" aria-label="Find a document" />
      )}
      {shown.map((group) => (
        <section key={group.label} className="min-w-0">
          {!single && <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>}
          <ul className="grid list-none grid-cols-[minmax(0,1fr)] gap-0.5 p-0">
            {group.items.map((item) => {
              const open = item.id === activeId;
              const unfolded = open && folded !== item.id;
              const title = readableTitle(item.title);
              return (
                <li key={item.id} className="min-w-0">
                  <div className={cn("flex min-w-0 items-start rounded-md border-l-2", open ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent")}>
                    <button
                      type="button"
                      aria-label={open ? (unfolded ? `Fold ${title}` : `Unfold ${title}`) : `Open ${title}`}
                      aria-expanded={open ? unfolded : false}
                      onClick={() => (open ? setFolded(unfolded ? item.id : null) : onSelect(item.id))}
                      className="grid h-7 w-6 shrink-0 place-items-center text-muted-foreground hover:text-foreground"
                    >
                      {unfolded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      aria-current={open ? "true" : undefined}
                      title={title}
                      onClick={() => (open ? onJump(-1) : onSelect(item.id))}
                      className={cn(
                        "min-w-0 flex-1 py-1.5 pr-2 text-left text-[13px] leading-snug",
                        open ? "font-semibold text-primary-ink" : "font-medium text-foreground/80 hover:text-foreground",
                      )}
                    >
                      <span className="line-clamp-2">{title}</span>
                    </button>
                    {item.flag && <span className="shrink-0 py-1.5 pr-2 text-[11px] text-destructive-ink">{item.flag}</span>}
                  </div>
                  {unfolded && item.content && (
                    <div className="ml-3 mt-0.5 border-l border-border/70 pb-1">
                      <DocumentOutline key={`${item.id}:${item.content.length}`} content={item.content} titleLabel={title} onJump={onJump} sections="all" showTitle={false} label={`${title} outline`} />
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
