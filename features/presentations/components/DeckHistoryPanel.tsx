"use client";

/**
 * Version history (Google's right-hand panel): every saved version of the deck from the platform's
 * row history, newest first. Picking one previews its first slide; "Restore this version" makes it
 * the current deck (restoring is itself a new version — nothing is destroyed).
 */

import { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { getVersionSnapshot, listVersions, restoreVersion, type VersionEntry } from "@/lib/versioning/versionHistory";
import { normalizeDeck, type Deck } from "../deck-model";
import { slideAspect, slideSizeOf } from "@/components/mardown-display/blocks/presentations/slide-size";
import { PaperSlide } from "../slide-paper";

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function DeckHistoryPanel({
  presentationId,
  canEdit,
  onClose,
  onRestored,
}: {
  presentationId: string;
  canEdit: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<VersionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [preview, setPreview] = useState<Deck | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let live = true;
    void listVersions("presentation", presentationId, { limit: 100 }).then((r) => {
      if (!live) return;
      if (r.error) setError(r.error);
      else setVersions(r.data ?? []);
    });
    return () => {
      live = false;
    };
  }, [presentationId]);

  useEffect(() => {
    if (picked === null) return undefined;
    let live = true;
    void getVersionSnapshot("presentation", presentationId, picked).then((r) => {
      if (!live) return;
      const row = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : null;
      setPreview(row ? normalizeDeck(row.deck) : null);
    });
    return () => {
      live = false;
    };
  }, [picked, presentationId]);

  const restore = async () => {
    if (picked === null) return;
    setRestoring(true);
    const r = await restoreVersion("presentation", presentationId, picked);
    setRestoring(false);
    if (r.error) {
      toast.error("Could not restore that version", { description: r.error });
      return;
    }
    toast.success(`Restored version ${picked}`);
    onRestored();
  };

  return (
    <aside aria-label="Version history" data-deck-history="" className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border pl-3 pr-1">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">Version history</h2>
        <Button variant="quiet" icon={<X />} aria-label="Close version history" onClick={onClose} />
      </div>
      {preview && (
        <div className="shrink-0 border-b border-border p-3">
          <div className="overflow-hidden rounded border border-border bg-white" style={{ aspectRatio: slideAspect(slideSizeOf(preview)) }}>
            <PaperSlide deck={preview} slide={preview.slides[0]} className="h-full w-full" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{preview.slides.length} slides</span>
            {canEdit && (
              <Button variant="primary" disabled={restoring} onClick={() => void restore()}>
                Restore this version
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive">
            {error}
            <ErrorAlchemyMenu error={error} />
          </div>
        ) : versions === null ? (
          <div className="p-3">
            <RegionSkeleton shape="rows" count={5} aria-label="Loading versions" />
          </div>
        ) : versions.length === 0 ? (
          <EmptyState icon={<History className="size-6" />} title="No versions yet" />
        ) : (
          <ul className="py-1">
            {versions.map((v) => (
              <li key={v.versionId}>
                <button
                  type="button"
                  data-clickable
                  aria-current={picked === v.versionNumber ? "true" : undefined}
                  onClick={() => setPicked(v.versionNumber)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent aria-[current=true]:bg-accent"
                >
                  <span className="text-sm">{when(v.changedAt)}</span>
                  <span className="text-xs text-muted-foreground">
                    Version {v.versionNumber}
                    {v.changeNote && v.changeNote !== "UPDATE" ? ` · ${v.changeNote.toLowerCase()}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
