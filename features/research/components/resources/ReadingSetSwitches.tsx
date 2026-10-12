"use client";

// The two switches for what a record's reading set adds to an agent run —
// open comment threads (default on) and the person's own notes (default off) —
// each showing how many there are. Used by the Context picker per kind and by
// Outputs for the report that feeds the publishing generators.

import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReadingSetSwitches({
  counts,
  value,
  onChange,
}: {
  counts: { open: number; notes: number };
  value: { comments: boolean; notes: boolean };
  onChange: (next: { comments: boolean; notes: boolean }) => void;
}) {
  const toggles = [
    { key: "comments", label: "Comments", count: counts.open, on: value.comments, hint: "Open comment threads ride along. Resolved ones never do." },
    { key: "notes", label: "My notes", count: counts.notes, on: value.notes, hint: "Your own private highlights and notes ride along." },
  ] as const;
  return (
    <>
      {toggles.map((toggle) => (
        <button
          key={toggle.key}
          type="button"
          aria-pressed={toggle.on}
          title={toggle.hint}
          onClick={() => onChange({ ...value, [toggle.key]: !toggle.on })}
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] tabular-nums transition-colors",
            toggle.on
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquareText className="h-2.5 w-2.5" aria-hidden />
          {toggle.label} {toggle.count}
        </button>
      ))}
    </>
  );
}
