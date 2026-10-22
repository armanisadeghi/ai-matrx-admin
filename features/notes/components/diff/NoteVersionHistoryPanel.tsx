"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "@/components/navigation/AppLink";
import SearchableSelect from "@/components/matrx/SearchableSelect";
import type { Option } from "@/components/matrx/SearchableSelect";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import {
  Loader2,
  Clock,
  RotateCcw,
  GitCompareArrows,
  History,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useCanvasPresentation } from "@ai-matrx/canvas/react";
import {
  fetchVersions,
  restoreVersion,
} from "@/features/text-diff/service/versionService";
import type { NoteVersion } from "@/features/text-diff/types";
import type { Note } from "@/features/notes/types";
import { selectNoteById } from "@/features/notes/redux/selectors";
import { fetchNoteContent, refetchNoteContent } from "@/features/notes/redux/thunks";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { analyzeDiff } from "@/features/notes/utils/diffAnalysis";
import { NoteDiffViewer } from "./NoteDiffViewer";
import {
  MatrxVersionTimeline,
  type VersionTimelineEntry,
} from "@ai-matrx/design-system/data-table";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export interface NoteVersionHistoryPanelProps {
  noteId: string;
  /** Side panel vs full /notes/[id]/diff route */
  variant?: "embedded" | "page";
  onVersionRestored?: (versionNumber: number) => void;
  className?: string;
}

export function NoteVersionHistoryPanel({
  noteId,
  variant = "embedded",
  onVersionRestored,
  className,
}: NoteVersionHistoryPanelProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [leftVersion, setLeftVersion] = useState<number | null>(null);
  const [rightVersion, setRightVersion] = useState<"current" | number>(
    "current",
  );
  const [restoring, setRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<"compare" | "history">("compare");

  const dispatch = useAppDispatch();
  const currentNote = useAppSelector(selectNoteById(noteId));
  const [currentNoteError, setCurrentNoteError] = useState<string | null>(null);
  // The raw rejection of the note read, kept so the standalone route can hand
  // it to the canonical AccessGate (fault vs. denied/missing/trashed).
  const [currentNoteReadError, setCurrentNoteReadError] = useState<unknown>(null);
  const isEmbedded = variant === "embedded";
  const isMobile = useIsMobile();
  // A narrow canvas pane stacks the compare columns the way a phone does.
  const isNarrowPane = useCanvasPresentation()?.isNarrow ?? false;
  const useStackedLayout = isMobile || isNarrowPane;

  // The RIGHT side of the default comparison is the live note, which this
  // panel reads out of the notes slice. Every host used to be responsible for
  // putting it there, and the standalone `/notes/[id]/diff` route never did —
  // a deep link or a refresh landed on "Select a version to see differences"
  // with both versions already selected. The panel now hydrates the note it
  // was handed; `fetchNoteContent` self-guards against duplicate fetches, so
  // hosts that already dispatch it (NoteBody, NotesWindow) pay nothing.
  useEffect(() => {
    if (!noteId) return;
    setCurrentNoteError(null);
    setCurrentNoteReadError(null);
    void dispatch(fetchNoteContent(noteId))
      .unwrap()
      .catch((err: unknown) => {
        setCurrentNoteReadError(err ?? new Error("note read rejected"));
        setCurrentNoteError(
          err instanceof Error
            ? err.message
            : "Could not load the current note.",
        );
      });
  }, [noteId, dispatch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVersions(noteId)
      .then((data) => {
        if (!cancelled) {
          setVersions(data);
          if (data.length > 0) {
            const currentVer = currentNote?.version;
            const best =
              currentVer != null
                ? data.find((v) => v.version_number !== currentVer)
                : data.length > 1
                  ? data[1]
                  : data[0];
            setLeftVersion(best?.version_number ?? data[0].version_number);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load versions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const leftSnapshot = useMemo(
    () => versions.find((v) => v.version_number === leftVersion),
    [versions, leftVersion],
  );

  const rightSnapshot = useMemo(() => {
    if (rightVersion === "current") return null;
    return versions.find((v) => v.version_number === rightVersion) ?? null;
  }, [versions, rightVersion]);

  const oldNote: Partial<Note> | null = leftSnapshot
    ? { content: leftSnapshot.content, label: leftSnapshot.label }
    : null;

  const newNote: Partial<Note> | null =
    rightVersion === "current" && currentNote
      ? currentNote
      : rightSnapshot
        ? { content: rightSnapshot.content, label: rightSnapshot.label }
        : null;

  // Restoring OVERWRITES what is on screen now, so the click stops and names
  // exactly that — and names the safe fact too (the current text is kept as a
  // new version, so this is undoable by restoring back). The confirmation is
  // the canonical `confirm()`: this panel used to hand-build an AlertDialog
  // for it, one of four bespoke confirm bodies the notes feature carried.
  const restoreWords = (version: number) => ({
    title: `Restore v${version}?`,
    description: `The note's current text is replaced by v${version} — anything typed since then disappears from the editor. It is not lost: the current text is saved to the history as a new version first, so you can restore back to it.`,
    confirmLabel: `Restore v${version}`,
  });

  const doRestore = async (version: number) => {
    setRestoring(true);
    try {
      await restoreVersion(noteId, version);
      toast.success(`Restored to v${version}`);
      onVersionRestored?.(version);
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setRestoring(false);
    }
  };

  const handleRestore = async () => {
    if (!leftVersion) return;
    const ok = await confirm(restoreWords(leftVersion));
    if (!ok) return;
    await doRestore(leftVersion);
  };

  const leftVersionOptions: Option[] = versions.map((v) => ({
    value: v.version_number.toString(),
    label: `v${v.version_number}${v.change_type ? ` — ${v.change_type}` : ""}`,
  }));

  const rightVersionOptions: Option[] = [
    {
      value: "current",
      label: `Current Note${currentNote?.version != null ? ` (v${currentNote.version})` : ""}`,
    },
    ...versions.map((v) => ({
      value: v.version_number.toString(),
      label: `v${v.version_number}${v.change_type ? ` — ${v.change_type}` : ""}`,
    })),
  ];

  const handleHistoryCompare = (
    version: number,
    compareToVersion: number | "current",
  ) => {
    setLeftVersion(version);
    setRightVersion(compareToVersion);
    setActiveTab("compare");
  };

  // /notes/[id]/diff for a note this viewer cannot read: the note read itself
  // rejected, so the page is about nothing it may show — render the canonical
  // gate instead of an empty "No version history" or a bare error line.
  if (!isEmbedded && currentNoteReadError && !currentNote) {
    return (
      <div className={cn("h-full overflow-y-auto", className)}>
        <AccessGate
          token="note"
          id={noteId}
          error={currentNoteReadError}
          onRetry={() => {
            setCurrentNoteError(null);
            setCurrentNoteReadError(null);
            void dispatch(fetchNoteContent(noteId))
              .unwrap()
              .catch((err: unknown) => {
                setCurrentNoteReadError(err ?? new Error("note read rejected"));
                setCurrentNoteError(
                  err instanceof Error ? err.message : "Could not load the current note.",
                );
              });
          }}
          fallbackHref="/notes"
          fallbackLabel="All notes"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center gap-2 text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Loading version history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center text-sm text-destructive",
          className,
        )}
      >
        {error}
        <ErrorAlchemyMenu error={error} />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        No version history found for this note.
      </div>
    );
  }

  const leftLabel = leftSnapshot
    ? `Version ${leftSnapshot.version_number}`
    : "Select a version";
  const rightLabel =
    rightVersion === "current"
      ? `Current Note${currentNote?.version != null ? ` (v${currentNote.version})` : ""}`
      : `Version ${rightVersion}`;

  const compareControls = (
    <div
      className={cn(
        "min-w-0",
        isEmbedded ? "flex flex-col gap-2" : "flex flex-1 items-center gap-3",
      )}
    >
      <div className={cn(isEmbedded ? "w-full" : "w-[220px]")}>
        <SearchableSelect
          options={leftVersionOptions}
          value={leftVersion?.toString() ?? undefined}
          onChange={(opt) =>
            startTransition(() => setLeftVersion(parseInt(opt.value, 10)))
          }
          placeholder="Select version..."
          searchPlaceholder="Search..."
        />
      </div>
      {!isEmbedded ? (
        <span className="text-xs text-muted-foreground">vs</span>
      ) : null}
      <div className={cn(isEmbedded ? "w-full" : "w-[260px]")}>
        <SearchableSelect
          options={rightVersionOptions}
          value={rightVersion.toString()}
          onChange={(opt) =>
            startTransition(() =>
              setRightVersion(
                opt.value === "current" ? "current" : parseInt(opt.value, 10),
              ),
            )
          }
          placeholder="Compare to..."
          searchPlaceholder="Search..."
        />
      </div>

      {leftSnapshot && !isEmbedded ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(leftSnapshot.created_at).toLocaleString()}
        </div>
      ) : null}

      {!isEmbedded ? <div className="flex-1" /> : null}

      {leftVersion != null && (
        <Button
          icon={restoring ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RotateCcw />
          )}
          variant="outline"
          className={cn(isEmbedded && "w-full")}
          onClick={handleRestore}
          disabled={restoring}
        >
          Restore v{leftVersion}
        </Button>
      )}
    </div>
  );

  const compareViewer =
    oldNote && newNote ? (
      <NoteDiffViewer
        oldNote={oldNote}
        newNote={newNote}
        oldLabel={leftLabel}
        newLabel={rightLabel}
        className={useStackedLayout ? "min-h-[40dvh]" : "h-full"}
      />
    ) : (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-4 text-center text-sm",
          useStackedLayout ? "min-h-[24dvh]" : "h-full",
        )}
      >
        {/*
          Never say "select a version" while a version IS selected. The only
          reasons a side can be missing are named here, each with its remedy.
        */}
        {currentNoteError ? (
          <>
            <span className="text-destructive">
              Could not load the current note — {currentNoteError}
              <ErrorAlchemyMenu error={currentNoteError} />
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentNoteError(null);
                void dispatch(fetchNoteContent(noteId));
              }}
            >
              Try again
            </Button>
          </>
        ) : !oldNote ? (
          <span className="text-muted-foreground">
            Select a version to see differences
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading the current note…
          </span>
        )}
      </div>
    );

  if (useStackedLayout) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-y-auto",
          className,
        )}
      >
        <section className="shrink-0 space-y-2 border-b border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Compare</h3>
          </div>
          {compareControls}
        </section>

        <section className="min-h-[40dvh] shrink-0 border-b border-border">
          {compareViewer}
        </section>

        <section className="shrink-0 py-2">
          <div className="flex items-center gap-2 px-3 pb-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">History</h3>
          </div>
          <NoteHistoryTimeline
            noteId={noteId}
            onRestore={doRestore}
            restoreWords={restoreWords}
            versions={versions}
            currentVersion={currentNote?.version ?? null}
            compact
            onCompare={handleHistoryCompare}
          />
        </section>

      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "compare" | "history")}
        className="flex h-full min-h-0 flex-col"
      >
        <div
          className={cn(
            "shrink-0 border-b border-border bg-card/50",
            isEmbedded
              ? "flex flex-col gap-2 px-3 py-2"
              : "flex items-center gap-3 px-4 py-2",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <TabsList className="shrink-0">
              <TabsTrigger
                value="compare"
              >
                <GitCompareArrows className="h-3 w-3" />
                Compare
              </TabsTrigger>
              <TabsTrigger
                value="history"
              >
                <History className="h-3 w-3" />
                History
              </TabsTrigger>
            </TabsList>

            {isEmbedded ? (
              <Link
                href={`/notes/${noteId}/diff`}
                className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Open full diff view"
                 target="_blank"
                 rel="noopener noreferrer"
               >
                <ExternalLink className="h-3 w-3" />
                Full view
              </Link>
            ) : null}
          </div>

          {activeTab === "compare" && compareControls}
        </div>

        <TabsContent
          value="compare"
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
          {compareViewer}
        </TabsContent>

        <TabsContent
          value="history"
          className={cn(
            "mt-0 min-h-0 flex-1 overflow-y-auto",
            !isEmbedded && "scroll-page-end-space",
          )}
        >
          <NoteHistoryTimeline
            noteId={noteId}
            onRestore={doRestore}
            restoreWords={restoreWords}
            versions={versions}
            currentVersion={currentNote?.version ?? null}
            compact={isEmbedded}
            onCompare={handleHistoryCompare}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}

/** The note's versions on THE shared version timeline: line/char counts against the previous
 * version, the change source and type, compare with previous / current, Restore behind the
 * same confirm the Compare tab uses. */
function NoteHistoryTimeline({
  noteId,
  versions,
  currentVersion,
  compact = false,
  onCompare,
  onRestore,
  restoreWords,
}: {
  noteId: string;
  versions: NoteVersion[];
  currentVersion: number | null;
  compact?: boolean;
  onCompare: (version: number, compareTo: number | "current") => void;
  onRestore: (version: number) => Promise<void>;
  restoreWords: (version: number) => { title: string; description: string; confirmLabel: string };
}) {
  const sorted = [...versions].sort(
    (a, b) => b.version_number - a.version_number,
  );
  const entries: VersionTimelineEntry[] = sorted.map((v, i) => {
    const prev = sorted[i + 1];
    const diff = prev ? analyzeDiff(prev.content, v.content) : null;
    return {
      number: v.version_number,
      at: v.created_at,
      source: v.change_source,
      note: v.change_type ?? null,
      changesText: diff
        ? `${diff.linesChanged} line${diff.linesChanged !== 1 ? "s" : ""}${
            diff.charsChanged > 0 ? ` · ${diff.charsChanged} chars` : ""
          }${!diff.hasChangesExcludingWhitespace ? " (whitespace only)" : ""}`
        : null,
    };
  });

  return (
    <div className={compact ? "p-3" : "px-4 py-3"}>
      <MatrxVersionTimeline
        tableId={`note.${noteId}.versions`}
        versions={entries}
        currentNumber={currentVersion}
        layout={compact ? "cards" : "table"}
        onCompare={onCompare}
        restore={{
          onRestore: (v) => onRestore(v.number),
          confirm: (v) => restoreWords(v.number),
        }}
      />
      {compact ? null : <div className="h-[var(--matrx-page-runway)]" />}
    </div>
  );
}
