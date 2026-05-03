"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchRawSegmentsThunk } from "../redux/thunks";
import type { StudioSession } from "../types";
import { RecordButton } from "./recording/RecordButton";
import { RawTranscriptColumn } from "./columns/RawTranscriptColumn";
import { useStudioSession } from "../hooks/useStudioSession";

interface ActiveSessionViewProps {
  session: StudioSession;
}

/**
 * Phase 3 active-session view: header (title + record button) + Column 1.
 * Columns 2/3/4 + the resizable shell + sync-scroll all land in Phase 4.
 */
export function ActiveSessionView({ session }: ActiveSessionViewProps) {
  const dispatch = useAppDispatch();
  const recording = useStudioSession({ sessionId: session.id });

  // Hydrate raw segments for this session on mount + when the session
  // identity changes. The list is small for v1 (one chunk every ~10s,
  // a few hundred for a 1h session) so a single fetch is fine.
  const hasIds = useAppSelector(
    (state) => Boolean(state.transcriptStudio.rawIdsBySession[session.id]),
  );
  useEffect(() => {
    if (!hasIds) {
      void dispatch(fetchRawSegmentsThunk({ sessionId: session.id }));
    }
    // Only refetch on session swap; subsequent appends use rawSegmentsAppended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, dispatch]);

  const subtitle = useMemo(() => {
    const created = new Date(session.createdAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const status = session.status === "idle" ? "ready" : session.status;
    const link = session.transcriptId ? "linked" : "standalone";
    return `${status} · ${link} · ${created}`;
  }, [session.createdAt, session.status, session.transcriptId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-textured">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-sm font-semibold">{session.title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <RecordButton sessionId={session.id} />
      </header>

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-2 gap-2">
        {/*
          Phase 3 lays Column 1 alone. Phase 4 introduces the 4-column
          resizable shell + sync-scroll provider. Until then we render
          Column 1 full-width inside a stable card.
        */}
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-md border border-border/60 bg-background">
          <RawTranscriptColumn
            sessionId={session.id}
            isRecording={recording.isOwnedRecording}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
