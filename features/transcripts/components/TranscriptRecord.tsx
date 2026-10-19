"use client";

/**
 * TranscriptRecord — ONE transcript, whole: the processor's viewer (audio player, timecoded segments,
 * title / description / body editing, copy, export, convert to Studio, custom fields) with its
 * `matrx-user/transcripts` agent surface, for the transcript with this id. A board tile renders it.
 *
 * The viewer shows the transcript in the list store; one that is not in the list (shared, or from
 * another organization) is read by id once (RLS decides) and put there. It never changes which
 * transcript the processor page has selected.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTranscripts, transcriptUpserted } from "../redux/transcriptsSlice";
import { fetchTranscriptById } from "../service/transcriptsService";
import { TranscriptViewer } from "./TranscriptViewer";

export function TranscriptRecord({ transcriptId, onTitle }: { transcriptId: string; onTitle?: (title: string) => void }) {
  const dispatch = useAppDispatch();
  const transcript = useAppSelector((s) => selectTranscripts(s).find((t) => t.id === transcriptId) ?? null);
  const [failure, setFailure] = useState<string | null>(null);
  const [again, setAgain] = useState(0);
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (transcript) return;
    const attempt = `${transcriptId}:${again}`;
    if (tried.current === attempt) return;
    tried.current = attempt;
    let alive = true;
    fetchTranscriptById(transcriptId)
      .then((row) => {
        if (!alive) return;
        if (row) dispatch(transcriptUpserted(row));
        else setFailure("That transcript is not available: it may have been deleted, or it is not shared with you.");
      })
      .catch((e: unknown) => alive && setFailure(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [transcript, transcriptId, again, dispatch]);

  const title = transcript?.title ?? null;
  useEffect(() => {
    if (title) onTitle?.(title);
  }, [title, onTitle]);

  if (transcript) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <TranscriptViewer transcriptId={transcriptId} />
      </div>
    );
  }
  if (failure) {
    return (
      <div className="p-4">
        <ErrorNotice
          size="compact"
          title="This transcript could not be opened"
          message={failure}
          operation="Open a transcript on the board"
          onRetry={() => {
            setFailure(null);
            setAgain((n) => n + 1);
          }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center" aria-busy="true" aria-label="Loading the transcript">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
