"use client";

/**
 * Transcript on a board. The tile body IS `TranscriptRecord` (`features/transcripts/components/
 * TranscriptRecord.tsx`) around the very `TranscriptViewer` the processor page renders: the audio
 * player, the timecoded segments, title / description / body editing, copy, export, convert to
 * Studio, custom fields — and the `matrx-user/transcripts` agent surface (segments, speakers, audio
 * position, the title / description / segment write targets) mounted by the viewer itself for THIS
 * transcript. Only the processor's sidebar list and header are left out.
 *
 * Start new is the canonical "New transcript" dialog (record, upload or paste); the tile becomes the
 * transcript it saves. Bring in lists the person's transcripts in every organization (`all` scope),
 * never the active one.
 *
 * Pure helpers: ./transcript-items.logic.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileAudio } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { TranscriptRecord } from "@/features/transcripts/components/TranscriptRecord";
import { CreateTranscriptModal } from "@/features/transcripts/components/CreateTranscriptModal";
import { fetchTranscripts } from "@/features/transcripts/service/transcriptsService";
import { selectActiveTranscriptId, selectTranscripts } from "@/features/transcripts/redux/transcriptsSlice";
import type { Transcript } from "@/features/transcripts/types";
import { useAppStore } from "@/lib/redux/hooks";
import { entityComments, type BoardItemType, type ItemBodyProps, type PickerProps } from "./types";
import { RecordList } from "./feature-items";
import { titleToAdopt } from "./feature-items.logic";
import { MeetingNotesStructure } from "./structures";
import { nameMatches } from "./record-finders";
import { NEW_TRANSCRIPT_TITLE, TRANSCRIPT_ITEM_KEY, transcriptHref, transcriptIdOf, transcriptSource } from "./transcript-items.logic";

type Read = { phase: "reading" } | { phase: "read"; rows: Transcript[] } | { phase: "failed"; why: string };

const everyOrganization = { kind: "all" } as const;

function TranscriptPicker({ onPick, onCancel }: PickerProps) {
  const [read, setRead] = useState<Read>({ phase: "reading" });
  const [again, setAgain] = useState(0);
  useEffect(() => {
    let alive = true;
    setRead({ phase: "reading" });
    fetchTranscripts(everyOrganization, null)
      .then((rows) => alive && setRead({ phase: "read", rows }))
      .catch((e: unknown) => alive && setRead({ phase: "failed", why: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [again]);
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <RecordList
        rows={read.phase === "read" ? read.rows : []}
        read={readOf(
          { loading: read.phase === "reading", error: read.phase === "failed" ? new Error(read.why) : null },
          { what: "your transcripts", onRetry: () => setAgain((n) => n + 1) },
        )}
        rowKey={(t) => t.id}
        rowText={(t) => `${t.title} ${t.description}`}
        onChoose={(t) => onPick([{ title: t.title, source: transcriptSource(t.id) }])}
        onCancel={onCancel}
        emptyState={<>No transcripts yet. Make one with New transcript.</>}
        renderRow={(t) => <span className="min-w-0 flex-1 truncate">{t.title}</span>}
      />
    </div>
  );
}

/** The canonical New transcript dialog; the tile becomes the transcript it saved (the one that became selected). */
function TranscriptCreateDialog({ onPick, onCancel }: PickerProps) {
  const store = useAppStore();
  const before = useRef(selectActiveTranscriptId(store.getState()));
  return (
    <CreateTranscriptModal
      isOpen
      onClose={() => {
        const state = store.getState();
        const id = selectActiveTranscriptId(state);
        const made = id && id !== before.current ? selectTranscripts(state).find((t) => t.id === id) : null;
        if (made) onPick([{ title: made.title, source: transcriptSource(made.id) }]);
        else onCancel();
      }}
    />
  );
}

function TranscriptBody({ source, title, onSource }: ItemBodyProps) {
  const id = transcriptIdOf(source);
  // The tile is named after its transcript (renamed here, on its page, or by an agent).
  const follow = useCallback(
    (name: string) => {
      const next = titleToAdopt(title, name);
      if (next) onSource(source, next);
    },
    [title, source, onSource],
  );
  if (!id) return null;
  return (
    <div className="h-full min-h-0 bg-background">
      <TranscriptRecord key={id} transcriptId={id} onTitle={follow} />
    </div>
  );
}

export const TRANSCRIPT_ITEMS: readonly BoardItemType[] = [
  {
    key: TRANSCRIPT_ITEM_KEY,
    surface: { name: "matrx-user/transcripts" },
    comments: entityComments("transcript"),
    label: "Transcript",
    kindLabel: "transcript",
    icon: FileAudio,
    group: "work",
    section: "meetings",
    accent: "cyan",
    structure: MeetingNotesStructure,
    status: { none: "A saved transcript has no running state; recording and drafts live in the New transcript dialog." },
    // Header, audio player, then a long run of timecoded segments.
    defaultSize: { w: 860, h: 1000 },
    matches: (s) => s.kind === "entity" && s.entity === TRANSCRIPT_ITEM_KEY,
    Body: TranscriptBody,
    startNew: { label: "New transcript", Dialog: TranscriptCreateDialog },
    bringIn: { label: "Transcript", Picker: TranscriptPicker },
    record: {
      place: (id, title) => ({ title: title?.trim() || "Transcript", source: transcriptSource(id) }),
      // Not in the search projection: the transcript picker's own list (every organization), matched on the name.
      find: async (query, limit) => {
        const rows = await fetchTranscripts(everyOrganization, null);
        return rows
          .filter((t) => nameMatches(query, t.title))
          .slice(0, limit)
          .map((t) => ({ type: TRANSCRIPT_ITEM_KEY, id: t.id, title: t.title, updated_at: t.updated_at, ...(t.description ? { snippet: t.description } : {}) }));
      },
    },
    href: (s) => {
      const id = transcriptIdOf(s);
      return id ? transcriptHref(id) : null;
    },
  },
];
