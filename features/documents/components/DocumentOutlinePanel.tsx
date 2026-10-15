"use client";

/**
 * View → Show outline: the document's headings beside the page, one click to jump. Rebuilt a
 * moment after any edit; reads the live snapshot through the host, never its own copy.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { collectOutline, type OutlineItem } from "@/features/documents/chrome/doc-outline";

export function DocumentOutlinePanel({
  readSnapshot,
  onJump,
  onClose,
}: {
  readSnapshot: () => unknown;
  onJump: (offset: number) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<OutlineItem[]>([]);
  useEffect(() => {
    const refresh = () => {
      const next = collectOutline(readSnapshot());
      setItems((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [readSnapshot]);

  return (
    <aside data-document-outline="" className="flex w-60 shrink-0 flex-col border-r border-border bg-background" aria-label="Document outline">
      <div className="flex h-9 items-center justify-between px-3 text-sm font-medium">
        Outline
        <button type="button" aria-label="Close outline" className="rounded p-1 hover:bg-accent" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto pb-3">
        {items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Headings you add appear here.</p>
        ) : (
          items.map((it, i) => (
            <button
              key={`${it.offset}-${i}`}
              type="button"
              data-outline-level={it.level}
              className={cn("block w-full truncate py-1 pr-3 text-left text-sm hover:bg-accent", it.level === 1 && "font-medium")}
              style={{ paddingLeft: 12 + (it.level - 1) * 14 }}
              onClick={() => onJump(it.offset)}
            >
              {it.text}
            </button>
          ))
        )}
      </nav>
    </aside>
  );
}
