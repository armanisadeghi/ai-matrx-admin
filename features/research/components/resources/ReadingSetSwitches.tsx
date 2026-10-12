"use client";

// The two switches for what a record's reading set adds to an agent run —
// open comment threads (default on) and the person's own notes (default off) —
// each showing how many there are. Used by the Context picker per kind and by
// Outputs for the report that feeds the publishing generators.

import { MessageSquareText } from "lucide-react";
import { Chip } from "@ai-matrx/design-system/controls";

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
    { key: "comments", label: `Comments ${counts.open}`, on: value.comments, hint: "Open comment threads ride along. Resolved ones never do." },
    { key: "notes", label: `My notes ${counts.notes}`, on: value.notes, hint: "Your own private highlights and notes ride along." },
  ] as const;
  return (
    <>
      {toggles.map((toggle) => (
        <Chip key={toggle.key} asChild pressed={toggle.on} label={toggle.label} icon={<MessageSquareText aria-hidden />} title={toggle.hint}>
          <button type="button" onClick={() => onChange({ ...value, [toggle.key]: !toggle.on })} />
        </Chip>
      ))}
    </>
  );
}
