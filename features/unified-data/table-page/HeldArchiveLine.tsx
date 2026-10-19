"use client";

// features/unified-data/table-page/HeldArchiveLine.tsx — the held-archive question, ONE component for every synced
// table bar (Notion, Airtable/GitHub, sheets/links/outside databases/view copies). Words: heldArchive.ts.

import { Button } from "@ai-matrx/design-system/controls";

import { heldSentence } from "./heldArchive";

export function HeldArchiveLine({ source, held, was, busy, onArchive, onKeep }: {
  source: string;
  held: number;
  was?: number | null;
  busy: boolean;
  onArchive: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="flex items-center gap-1" data-held-archive="">
      <span className="text-sm text-muted-foreground">{heldSentence(source, held, was)}</span>
      <Button type="button" variant="outline" disabled={busy} onClick={onArchive} data-held-archive-archive="">
        Archive
      </Button>
      <Button type="button" variant="quiet" disabled={busy} onClick={onKeep} data-held-archive-keep="">
        Keep
      </Button>
    </div>
  );
}
