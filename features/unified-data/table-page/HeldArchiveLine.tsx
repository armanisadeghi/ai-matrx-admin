"use client";

// features/unified-data/table-page/HeldArchiveLine.tsx — the held-archive question, ONE component for every synced
// table (Notion, Airtable/GitHub, sheets/links/outside databases/view copies), drawn ONCE as the strip above the
// grid (HeldArchiveStrip). Words: heldArchive.ts. After Keep the header shows "N kept" (HeldKeptChip) that asks again.

import { Archive } from "lucide-react";

import { Button, Chip, PromoBanner } from "@ai-matrx/design-system/controls";

import { heldSentence } from "./heldArchive";
import { closeHeld, reopenHeld, useHeldOffer } from "./heldArchiveStore";

export function HeldArchiveLine({ source, held, was, busy, onArchive, onKeep }: {
  source: string;
  held: number;
  was?: number | null;
  busy: boolean;
  onArchive: () => void;
  onKeep: () => void;
}) {
  return (
    <div data-held-archive="">
      <PromoBanner
        tone="warning"
        wrap
        icon={<Archive className="h-4 w-4" aria-hidden />}
        title={heldSentence(source, held, was)}
        aria-label="Rows no longer listed"
        action={
          <span className="inline-flex items-center gap-1">
            <Button type="button" variant="outline" disabled={busy} onClick={onArchive} data-held-archive-archive="">
              Archive
            </Button>
            <Button type="button" variant="quiet" disabled={busy} onClick={onKeep} data-held-archive-keep="">
              Keep
            </Button>
          </span>
        }
      />
    </div>
  );
}

/** The one place the question is asked: above the grid, only while a hold is open (or reopened from "N kept"). */
export function HeldArchiveStrip({ tableId }: { tableId: string }) {
  const offer = useHeldOffer(tableId);
  if (!offer) return null;
  return (
    <div className="pb-1" data-held-archive-strip="">
      <HeldArchiveLine source={offer.source} held={offer.held} was={offer.was} busy={offer.busy}
        onArchive={offer.onArchive}
        onKeep={() => { closeHeld(tableId); offer.onKeep(); }} />
    </div>
  );
}

/** After Keep: "N kept" in the header, in place of the synced time. Pressing it asks the question again. */
export function HeldKeptChip({ tableId, count }: { tableId: string; count: number }) {
  return (
    <Chip asChild tone="amber" label={`${count} kept`}>
      <button type="button" aria-label={`${count} kept: archive them?`} onClick={() => reopenHeld(tableId)} data-held-kept="" />
    </Chip>
  );
}
