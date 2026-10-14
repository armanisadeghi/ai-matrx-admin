"use client";

/** Marks the words of the panel's search inside a list label. */

import { highlightParts } from "../find";

export function BuilderHighlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.hit ? (
          <mark key={i} className="rounded-sm bg-amber-200/80 text-foreground dark:bg-amber-500/40">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
