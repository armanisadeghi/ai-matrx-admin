"use client";

import { useEffect, useMemo, useRef } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { COLUMN_IDS } from "../../constants";
import type { RawSegment } from "../../types";
import { useScrollSyncOptional } from "../scroll-sync/ScrollSyncProvider";
import { ColumnEmptyState } from "./ColumnEmptyState";
import { ColumnHeader } from "./ColumnHeader";
import { SegmentWrapper } from "./SegmentWrapper";

interface RawTranscriptColumnProps {
  sessionId: string;
  /** True iff this session is the active recording. Drives the live dot. */
  isRecording: boolean;
  className?: string;
}

function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return `${m}:${s.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${mm.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function summarizeSegments(segs: RawSegment[]): string {
  if (segs.length === 0) return "";
  const lastEnd = segs[segs.length - 1]!.tEnd;
  return `${segs.length} chunk${segs.length === 1 ? "" : "s"} · ${formatTimecode(lastEnd)}`;
}

export function RawTranscriptColumn({
  sessionId,
  isRecording,
  className,
}: RawTranscriptColumnProps) {
  // Subscribe to the raw segment ids + the byId map separately so React-Redux
  // sees stable references for both. Materialize the array via `useMemo` —
  // not a `createSelector`, since per-(sessionId) selectors that close over
  // session-specific state interact poorly with subscription resync in
  // React 19's concurrent mode.
  const ids = useAppSelector(
    (state) => state.transcriptStudio.rawIdsBySession[sessionId],
  );
  const byId = useAppSelector(
    (state) => state.transcriptStudio.rawById[sessionId],
  );
  const segments = useMemo<RawSegment[]>(() => {
    if (!ids || !byId) return [];
    const out: RawSegment[] = [];
    for (const id of ids) {
      const seg = byId[id];
      if (seg) out.push(seg);
    }
    return out;
  }, [ids, byId]);
  const status = useMemo(() => summarizeSegments(segments), [segments]);

  const sync = useScrollSyncOptional();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sync) return;
    sync.registerColumn(COLUMN_IDS.raw, scrollRef.current);
    return () => sync.registerColumn(COLUMN_IDS.raw, null);
  }, [sync]);

  const onPointerLead = sync
    ? () => sync.markLeader(COLUMN_IDS.raw)
    : undefined;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col bg-background",
        className,
      )}
      aria-label="Raw transcript"
    >
      <ColumnHeader
        icon={Mic}
        label="Raw"
        status={status || undefined}
        dotState={isRecording ? "live" : "idle"}
      />
      {segments.length === 0 ? (
        <ColumnEmptyState
          icon={Mic}
          title="No audio yet"
          description={
            isRecording
              ? "Speak — chunks land here every ~10 seconds."
              : "Press Record to begin. Each chunk appends below — never overwrites."
          }
        />
      ) : (
        <div
          ref={scrollRef}
          onWheel={onPointerLead}
          onTouchStart={onPointerLead}
          onPointerDown={onPointerLead}
          className="flex-1 min-h-0 overflow-y-auto py-1.5"
        >
          {segments.map((seg) => (
            <SegmentWrapper
              key={seg.id}
              column={COLUMN_IDS.raw}
              tStart={seg.tStart}
              tEnd={seg.tEnd}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                  {formatTimecode(seg.tStart)}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-words">
                  {seg.text}
                </span>
              </div>
            </SegmentWrapper>
          ))}
        </div>
      )}
    </section>
  );
}
