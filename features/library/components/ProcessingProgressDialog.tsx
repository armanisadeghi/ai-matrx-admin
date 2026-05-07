"use client";

/**
 * ProcessingProgressDialog — full-screen, multi-stage progress UI for
 * RAG document processing.
 *
 * Design goals:
 *   - Use the full available space, not a 400px popover.
 *   - Show ALL stages in one view as a stepper (Extract / Clean / Chunk / Embed).
 *   - Highlight the active stage with a live progress bar + heartbeat
 *     elapsed indicator.
 *   - Tell the user clearly that they can navigate away — the work
 *     continues on the server.
 *   - Minimize button → docks to a small floating widget in the bottom
 *     right of the viewport, still showing live progress.
 *   - Cancel button (sends abort to the running stream).
 *   - On done: a clear success card with stats per stage.
 *
 * Consumes any source that produces our streaming events; the caller
 * owns the connection (an async iterator over StageStreamEvent or the
 * legacy IngestStreamEvent — both shapes are translated to a unified
 * frame here).
 */

import {
  CheckCircle2,
  Cloud,
  FileText,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Sparkles,
  Wand2,
  X as XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Frame type — what the dialog renders. Caller's job is to convert their
// stream into a series of these.
// ---------------------------------------------------------------------------

export type ProcessingStageId = "extract" | "clean" | "chunk" | "embed";

export interface ProcessingFrame {
  /** Which stage is currently active. */
  activeStage: ProcessingStageId | null;
  /** Latest message from the active stage. */
  message: string;
  /** 0..1 — progress fraction within the active stage; null = indeterminate. */
  fraction: number | null;
  /** "240 / 586" current/total for the active stage. */
  current: number;
  total: number;
  /** Per-stage state — overrides default progression based on activeStage. */
  stageStates?: Partial<Record<ProcessingStageId, "pending" | "running" | "done" | "error">>;
  /** Last update wall-time (ms since epoch). Used to render "Xs since last update". */
  lastUpdate: number;
}

export interface ProcessingResultSummary {
  /** Per-stage one-line summaries to render in the success view. */
  byStage: Partial<Record<ProcessingStageId, string>>;
  /** Optional headline ("Indexed 1,843 chunks across 586 pages"). */
  headline?: string;
}

export interface ProcessingProgressDialogProps {
  open: boolean;
  /** Title of what's being processed (e.g. file name). */
  title: string;
  /** Subtitle (e.g. "Full pipeline" or "Re-embed only"). */
  subtitle?: string;
  /** Current progress frame. Set null to show "starting…". */
  frame: ProcessingFrame | null;
  /** When the run is fully complete, set this to render the success view. */
  result?: ProcessingResultSummary | null;
  /** When the run errored. */
  error?: string | null;
  /** Called when the user clicks Cancel / Stop. */
  onCancel?: () => void;
  /** Called when the user closes the dialog AFTER completion. */
  onClose: () => void;
  /** When false, hides the minimize button (e.g. mobile). */
  allowMinimize?: boolean;
}

// ---------------------------------------------------------------------------
// Stage definitions — single source of truth for label / icon / order.
// ---------------------------------------------------------------------------

const STAGES: {
  id: ProcessingStageId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: "extract",
    label: "Extract",
    Icon: FileText,
    description: "Reading raw text from each page",
  },
  {
    id: "clean",
    label: "Clean",
    Icon: Wand2,
    description: "LLM cleanup + section classification",
  },
  {
    id: "chunk",
    label: "Chunk",
    Icon: Layers,
    description: "Splitting into retrievable pieces",
  },
  {
    id: "embed",
    label: "Embed",
    Icon: Sparkles,
    description: "Generating embedding vectors",
  },
];

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function ProcessingProgressDialog({
  open,
  title,
  subtitle,
  frame,
  result,
  error,
  onCancel,
  onClose,
  allowMinimize = true,
}: ProcessingProgressDialogProps) {
  const [minimized, setMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  // SSR-safe portal mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset minimized state when the dialog opens fresh.
  useEffect(() => {
    if (open) setMinimized(false);
  }, [open]);

  // Block body scroll while the full overlay is shown.
  useEffect(() => {
    if (!open || minimized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, minimized]);

  if (!open || !mounted) return null;

  const ui = minimized ? (
    <MinimizedWidget
      title={title}
      frame={frame}
      result={result}
      error={error}
      onExpand={() => setMinimized(false)}
      onClose={onClose}
    />
  ) : (
    <FullOverlay
      title={title}
      subtitle={subtitle}
      frame={frame}
      result={result}
      error={error}
      onCancel={onCancel}
      onClose={onClose}
      onMinimize={allowMinimize ? () => setMinimized(true) : undefined}
    />
  );

  return createPortal(ui, document.body);
}

// ---------------------------------------------------------------------------
// Full-screen overlay
// ---------------------------------------------------------------------------

function FullOverlay({
  title,
  subtitle,
  frame,
  result,
  error,
  onCancel,
  onClose,
  onMinimize,
}: Omit<ProcessingProgressDialogProps, "open" | "allowMinimize"> & {
  onMinimize?: () => void;
}) {
  const stageStates = useMemo(
    () => deriveStageStates(frame, !!result, !!error),
    [frame, result, error],
  );
  const elapsedRef = useElapsedSinceLastUpdate(frame?.lastUpdate ?? null);
  const finished = !!result || !!error;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Processing progress"
    >
      {/* Header bar */}
      <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!finished && onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <Pause className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
          )}
          {!finished && onMinimize && (
            <Button variant="outline" size="sm" onClick={onMinimize}>
              <Minimize2 className="h-3.5 w-3.5 mr-1" />
              Minimize
            </Button>
          )}
          {finished && (
            <Button onClick={onClose}>
              <XIcon className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>
          )}
        </div>
      </header>

      {/* Stepper across the top of the body */}
      <div className="border-b px-6 py-4">
        <Stepper stageStates={stageStates} />
      </div>

      {/* Big "current state" panel — uses most of the viewport */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
          {error ? (
            <ErrorView error={error} />
          ) : result ? (
            <ResultView result={result} />
          ) : (
            <RunningView frame={frame} elapsedRef={elapsedRef} />
          )}

          {/* Reassurance footer */}
          {!finished && (
            <NavigateAwayCard />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function Stepper({
  stageStates,
}: {
  stageStates: Record<ProcessingStageId, "pending" | "running" | "done" | "error">;
}) {
  return (
    <ol className="grid grid-cols-4 gap-3">
      {STAGES.map((s) => {
        const state = stageStates[s.id];
        const Icon = s.Icon;
        const tone =
          state === "done"
            ? "text-green-700 dark:text-green-400 border-green-500/40 bg-green-500/10"
            : state === "running"
            ? "text-primary border-primary/50 bg-primary/10 ring-2 ring-primary/30"
            : state === "error"
            ? "text-destructive border-destructive/50 bg-destructive/10"
            : "text-muted-foreground border-border bg-muted/20";
        return (
          <li
            key={s.id}
            className={cn(
              "rounded-lg border px-3 py-2 transition-all",
              tone,
            )}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border bg-background/80">
                {state === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : state === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {s.label}
                </div>
                <div className="text-[11px] opacity-80 truncate">
                  {s.description}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Running view — what's playing in the middle while work is in flight
// ---------------------------------------------------------------------------

function RunningView({
  frame,
  elapsedRef,
}: {
  frame: ProcessingFrame | null;
  elapsedRef: { current: number };
}) {
  const stageDef = STAGES.find((s) => s.id === frame?.activeStage);
  const Icon = stageDef?.Icon ?? Cloud;
  const pct =
    frame?.fraction != null ? Math.min(100, Math.round(frame.fraction * 100)) : null;
  const [, force] = useState(0);
  // Re-render once per second so the "Xs ago" indicator advances.
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const sinceUpdate = elapsedRef.current;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <Icon className="absolute h-3.5 w-3.5 text-primary opacity-60" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {stageDef?.label ?? "Starting"}
              </h3>
              <Badge variant="info" className="text-[10px]">
                in progress
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground break-words">
              {frame?.message ??
                "Connecting to the server and queuing the work…"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 space-y-2">
          {pct != null ? (
            <Progress value={pct} className="h-3" />
          ) : (
            <Progress value={undefined} className="h-3" />
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>
              {(frame?.current ?? 0).toLocaleString()}
              {(frame?.total ?? 0) > 0 ? ` / ${frame!.total.toLocaleString()}` : ""}
            </span>
            <span>
              {pct != null ? `${pct}%` : "—"}
              {sinceUpdate > 2 ? ` · last update ${sinceUpdate}s ago` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavigateAwayCard() {
  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-500/15 p-1.5">
          <Maximize2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-1">
          <div className="font-medium">
            You can safely close or minimize this — processing continues on
            the server.
          </div>
          <div className="text-xs text-muted-foreground">
            Use <strong>Minimize</strong> to keep an eye on progress in the
            corner while you work, or close it and check back from the
            library row's status pills any time.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result view (success)
// ---------------------------------------------------------------------------

function ResultView({ result }: { result: ProcessingResultSummary }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">Done</h3>
            {result.headline && (
              <p className="text-sm text-muted-foreground mt-1">
                {result.headline}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {STAGES.map((s) => {
            const summary = result.byStage[s.id];
            if (!summary) return null;
            const Icon = s.Icon;
            return (
              <div
                key={s.id}
                className="flex items-start gap-2 rounded-md border bg-background p-3"
              >
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="text-sm">{summary}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error view
// ---------------------------------------------------------------------------

function ErrorView({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <XIcon className="h-7 w-7 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-destructive">
            Processing failed
          </h3>
          <p className="text-sm break-words mt-1">{error}</p>
          <p className="text-xs text-muted-foreground mt-3">
            You can retry the run from the library — re-running is safe and
            replaces any partial output.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimized floating widget (bottom right)
// ---------------------------------------------------------------------------

function MinimizedWidget({
  title,
  frame,
  result,
  error,
  onExpand,
  onClose,
}: {
  title: string;
  frame: ProcessingFrame | null;
  result?: ProcessingResultSummary | null;
  error?: string | null;
  onExpand: () => void;
  onClose: () => void;
}) {
  const finished = !!result || !!error;
  const stageDef = STAGES.find((s) => s.id === frame?.activeStage);
  const pct =
    frame?.fraction != null ? Math.min(100, Math.round(frame.fraction * 100)) : null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[340px] rounded-lg border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {finished ? (
          error ? (
            <XIcon className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate">{title}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {finished
              ? error
                ? "Failed"
                : "Done"
              : `${stageDef?.label ?? "Starting"} · ${frame?.message ?? "…"}`}
          </div>
        </div>
        <button
          onClick={onExpand}
          className="rounded p-1 hover:bg-accent"
          title="Expand"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        {finished && (
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-accent"
            title="Close"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {!finished && (
        <div className="px-3 pb-3 pt-2 space-y-1">
          <Progress value={pct ?? undefined} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>
              {(frame?.current ?? 0).toLocaleString()}
              {(frame?.total ?? 0) > 0 ? ` / ${frame!.total.toLocaleString()}` : ""}
            </span>
            <span>{pct != null ? `${pct}%` : "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive per-stage state from the active frame + completion flags. */
function deriveStageStates(
  frame: ProcessingFrame | null,
  done: boolean,
  failed: boolean,
): Record<ProcessingStageId, "pending" | "running" | "done" | "error"> {
  const out: Record<ProcessingStageId, "pending" | "running" | "done" | "error"> = {
    extract: "pending",
    clean: "pending",
    chunk: "pending",
    embed: "pending",
  };
  if (done) {
    for (const s of STAGES) out[s.id] = "done";
    return out;
  }
  // Honour explicit per-stage state from caller if present.
  if (frame?.stageStates) {
    for (const k of Object.keys(frame.stageStates) as ProcessingStageId[]) {
      out[k] = frame.stageStates[k] ?? out[k];
    }
  }
  // Otherwise derive from activeStage: everything before = done, active = running.
  const active = frame?.activeStage;
  if (active && !frame?.stageStates) {
    let seenActive = false;
    for (const s of STAGES) {
      if (s.id === active) {
        out[s.id] = failed ? "error" : "running";
        seenActive = true;
      } else if (!seenActive) {
        out[s.id] = "done";
      }
    }
  }
  if (failed && !frame?.stageStates) {
    out[(frame?.activeStage ?? "extract") as ProcessingStageId] = "error";
  }
  return out;
}

/** A ref that holds (in seconds) how long since the last update tick.
 *  Recomputed on every render — caller wraps RunningView in an interval
 *  to force re-render so this updates smoothly. */
function useElapsedSinceLastUpdate(lastUpdate: number | null): {
  current: number;
} {
  const ref = useRef<{ current: number }>({ current: 0 });
  if (lastUpdate == null) {
    ref.current.current = 0;
  } else {
    ref.current.current = Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000));
  }
  return ref.current;
}
