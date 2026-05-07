"use client";

/**
 * ProcessingProgressSheet — premium right-side panel showing live progress
 * for any number of processing jobs (single stage runs OR full pipelines).
 *
 * Design goals:
 *   - Slides in from the right (matches LibraryDocDetailSheet pattern; the
 *     full-screen overlay was breaking the rest of the app's tab feel).
 *   - Shows N jobs as a vertical stack of "live job" cards. With one job,
 *     the card uses the whole sheet height. With many, each card collapses
 *     to a header strip that expands back when focused.
 *   - Persists every stage's preview output as a card that stays visible
 *     after the next stage starts — the user explicitly asked to stop
 *     hiding the streamed text once a stage completes.
 *   - Smooth animation on stage transitions, progress, and preview swaps.
 *   - Per-job Stop / Dismiss controls; "Open in Library" deep-link on
 *     successful completion.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
  X as XIcon,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ProcessingFrame,
  ProcessingStageId,
  StagePreview,
} from "./ProcessingProgressDialog";
import type { ProcessingJob } from "../hooks/useProcessingRunner";

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

const STAGES: {
  id: ProcessingStageId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  /** Tailwind classes for the active-stage gradient ring. */
  hueFrom: string;
  hueTo: string;
}[] = [
  {
    id: "extract",
    label: "Extract",
    Icon: FileText,
    description: "Reading raw text from each page",
    hueFrom: "from-sky-500/30",
    hueTo: "to-sky-400/0",
  },
  {
    id: "clean",
    label: "Clean",
    Icon: Wand2,
    description: "LLM cleanup + section classification",
    hueFrom: "from-violet-500/30",
    hueTo: "to-violet-400/0",
  },
  {
    id: "chunk",
    label: "Chunk",
    Icon: Layers,
    description: "Splitting into retrievable pieces",
    hueFrom: "from-amber-500/30",
    hueTo: "to-amber-400/0",
  },
  {
    id: "embed",
    label: "Embed",
    Icon: Sparkles,
    description: "Generating embedding vectors",
    hueFrom: "from-emerald-500/30",
    hueTo: "to-emerald-400/0",
  },
];

const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ProcessingProgressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  jobs: ProcessingJob[];
  /** Job to scroll to / auto-expand when the sheet opens. */
  focusJobId?: string | null;

  onCancel: (jobId: string) => void;
  onDismiss: (jobId: string) => void;
  onCancelAll?: () => void;
  onDismissAll?: () => void;
}

export function ProcessingProgressSheet({
  open,
  onOpenChange,
  jobs,
  focusJobId,
  onCancel,
  onDismiss,
  onCancelAll,
  onDismissAll,
}: ProcessingProgressSheetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Default expansion: focused job, otherwise the first running job, otherwise
  // the top of the list. Recomputes when the sheet (re)opens.
  useEffect(() => {
    if (!open) return;
    if (focusJobId && jobs.some((j) => j.jobId === focusJobId)) {
      setExpandedId(focusJobId);
      return;
    }
    const firstRunning = jobs.find((j) => j.status === "running");
    setExpandedId(firstRunning?.jobId ?? jobs[0]?.jobId ?? null);
  }, [open, focusJobId, jobs]);

  // Scroll the focused card into view when the sheet opens.
  useEffect(() => {
    if (!open || !expandedId) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-job-id="${expandedId}"]`,
    );
    if (el)
      el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open, expandedId]);

  const runningCount = jobs.filter((j) => j.status === "running").length;
  const terminalCount = jobs.length - runningCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(100vw,720px)] sm:max-w-none flex flex-col p-0 gap-0"
      >
        <SheetHeader className="border-b px-5 py-4 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  {runningCount > 0 ? (
                    <>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </>
                  ) : (
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </span>
                Processing
              </SheetTitle>
              <SheetDescription>
                {jobs.length === 0
                  ? "No active jobs."
                  : runningCount > 0
                  ? `${runningCount} running · ${terminalCount} finished`
                  : `${jobs.length} finished`}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {runningCount > 0 && onCancelAll && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelAll}
                  className="h-7 text-xs"
                >
                  <XIcon className="h-3 w-3 mr-1" />
                  Stop all
                </Button>
              )}
              {terminalCount > 0 && onDismissAll && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDismissAll}
                  className="h-7 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear finished
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto">
          {jobs.length === 0 ? (
            <EmptyState />
          ) : (
            <ol className="p-4 space-y-4">
              <AnimatePresence initial={false}>
                {jobs.map((job) => (
                  <motion.li
                    key={job.jobId}
                    data-job-id={job.jobId}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <JobCard
                      job={job}
                      expanded={expandedId === job.jobId}
                      onToggle={() =>
                        setExpandedId((id) =>
                          id === job.jobId ? null : job.jobId,
                        )
                      }
                      onCancel={() => onCancel(job.jobId)}
                      onDismiss={() => onDismiss(job.jobId)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// One job card — premium layout
// ---------------------------------------------------------------------------

function JobCard({
  job,
  expanded,
  onToggle,
  onCancel,
  onDismiss,
}: {
  job: ProcessingJob;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const stageStates = useMemo(
    () => deriveStageStates(job),
    [job],
  );
  const isRunning = job.status === "running";
  const isFailed = job.status === "failed";
  const isDone = job.status === "succeeded";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-shadow",
        isRunning && "shadow-[0_0_0_1px] shadow-primary/20",
        isDone && "shadow-[0_0_0_1px] shadow-emerald-500/15",
        isFailed && "shadow-[0_0_0_1px] shadow-destructive/20",
      )}
    >
      {/* Header strip — always visible, click to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left",
          "hover:bg-accent/40 transition-colors",
        )}
      >
        <StatusOrb job={job} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{job.title}</h3>
            <JobStatusBadge job={job} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isRunning
              ? job.frame?.message ?? "Working…"
              : isFailed
              ? job.error ?? "Failed"
              : job.result?.headline ?? job.subtitle ?? "Done"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isRunning && (
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
          )}
          {!isRunning && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          )}
        </div>
      </button>

      {/* Mini progress bar visible even when collapsed (running jobs) */}
      {isRunning && (
        <div className="px-4 pb-2">
          <ShimmerProgress
            fraction={job.frame?.fraction ?? null}
            current={job.frame?.current ?? 0}
            total={job.frame?.total ?? 0}
            stageId={job.frame?.activeStage}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              <Stepper stageStates={stageStates} activeStage={job.frame?.activeStage} />

              {isRunning && job.frame && (
                <ActiveStagePanel frame={job.frame} />
              )}

              {isFailed && (
                <ErrorPanel error={job.error ?? "Processing failed."} />
              )}

              {isDone && job.result && (
                <ResultPanel result={job.result} byStage={job.byStage} />
              )}

              <PersistedStagesColumn job={job} />

              <JobActions
                job={job}
                onCancel={onCancel}
                onDismiss={onDismiss}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusOrb({ job }: { job: ProcessingJob }) {
  if (job.status === "running") {
    return (
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="absolute inset-0 rounded-full ring-2 ring-primary/30 animate-pulse" />
      </div>
    );
  }
  if (job.status === "succeeded") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }
  if (job.status === "failed") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="h-5 w-5 text-destructive" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
      <XIcon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function JobStatusBadge({ job }: { job: ProcessingJob }) {
  if (job.status === "running") {
    return (
      <Badge variant="info" className="text-[10px] px-1.5 py-0 h-4">
        running
      </Badge>
    );
  }
  if (job.status === "succeeded") {
    return (
      <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
        done
      </Badge>
    );
  }
  if (job.status === "failed") {
    return (
      <Badge variant="error" className="text-[10px] px-1.5 py-0 h-4">
        failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
      cancelled
    </Badge>
  );
}

function ShimmerProgress({
  fraction,
  current,
  total,
  stageId,
}: {
  fraction: number | null;
  current: number;
  total: number;
  stageId: ProcessingStageId | null | undefined;
}) {
  const pct =
    fraction != null ? Math.min(100, Math.round(fraction * 100)) : null;
  const stage = stageId ? STAGE_BY_ID.get(stageId) : null;
  return (
    <div className="space-y-1">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {pct == null ? (
          <motion.div
            className={cn(
              "absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r",
              stage?.hueFrom ?? "from-primary/20",
              stage?.hueTo ?? "to-primary/0",
            )}
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ) : (
          <>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-12 rounded-full bg-white/30 dark:bg-white/15 mix-blend-overlay"
              initial={{ x: "-100%" }}
              animate={{ x: `${Math.max(pct - 10, 0)}%` }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ filter: "blur(6px)" }}
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
        <span className="truncate">
          {(current ?? 0).toLocaleString()}
          {(total ?? 0) > 0 ? ` / ${total.toLocaleString()}` : ""}
        </span>
        <span>{pct != null ? `${pct}%` : "starting…"}</span>
      </div>
    </div>
  );
}

function Stepper({
  stageStates,
  activeStage,
}: {
  stageStates: Record<
    ProcessingStageId,
    "pending" | "running" | "done" | "error"
  >;
  activeStage?: ProcessingStageId | null;
}) {
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STAGES.map((s) => {
        const state = stageStates[s.id];
        const Icon = s.Icon;
        const isActive = state === "running";
        return (
          <li
            key={s.id}
            className={cn(
              "relative rounded-lg border px-2 py-2 transition-colors",
              state === "done" &&
                "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
              state === "running" &&
                "border-primary/50 bg-primary/5 text-primary",
              state === "error" &&
                "border-destructive/50 bg-destructive/5 text-destructive",
              state === "pending" &&
                "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`stepper-active-${activeStage}`}
                className="absolute inset-0 rounded-lg ring-2 ring-primary/40"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <div className="relative flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border bg-background/80 shrink-0">
                {state === "done" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                ) : state === "running" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : state === "error" ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <Icon className="h-2.5 w-2.5" />
                )}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide leading-tight truncate">
                  {s.label}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ActiveStagePanel({ frame }: { frame: ProcessingFrame }) {
  const stage = frame.activeStage ? STAGE_BY_ID.get(frame.activeStage) : null;
  const Icon = stage?.Icon;
  // Re-render every second so "Xs ago" is fresh.
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const sinceUpdate = frame.lastUpdate
    ? Math.max(0, Math.floor((Date.now() - frame.lastUpdate) / 1000))
    : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4">
      {/* Animated colored gradient backdrop matching the active stage */}
      <motion.div
        key={frame.activeStage ?? "none"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br",
          stage?.hueFrom ?? "from-primary/20",
          stage?.hueTo ?? "to-primary/0",
        )}
      />
      <div className="relative flex items-start gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border shrink-0">
          {Icon && (
            <motion.span
              key={frame.activeStage}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Icon className="h-4 w-4 text-primary" />
            </motion.span>
          )}
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/30 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.h4
                key={frame.activeStage ?? "starting"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold"
              >
                {stage?.label ?? "Starting"}
              </motion.h4>
            </AnimatePresence>
            {sinceUpdate > 2 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                last update {sinceUpdate}s ago
              </span>
            )}
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={frame.message}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-muted-foreground break-words mt-0.5"
            >
              {frame.message}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="relative mt-3">
        <ShimmerProgress
          fraction={frame.fraction}
          current={frame.current}
          total={frame.total}
          stageId={frame.activeStage}
        />
      </div>

      {frame.latestPreview && (
        <div className="relative mt-4 rounded-lg border bg-background/60 backdrop-blur-sm p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Live output
          </div>
          <StagePreviewBody preview={frame.latestPreview} compact />
        </div>
      )}
    </div>
  );
}

function PersistedStagesColumn({ job }: { job: ProcessingJob }) {
  const persisted = STAGES.filter((s) => {
    const preview = job.stagePreviews[s.id];
    const summary = job.byStage[s.id];
    if (!preview && !summary) return false;
    // Skip the active stage; ActiveStagePanel already shows it.
    if (job.frame?.activeStage === s.id && job.status === "running")
      return false;
    return true;
  });
  if (persisted.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
        Stage outputs
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {persisted.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border bg-card"
            >
              <details
                className="group"
                open={Boolean(job.stagePreviews[s.id])}
              >
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="font-semibold">{s.label}</span>
                  {job.byStage[s.id] && (
                    <span className="text-muted-foreground truncate">
                      · {job.byStage[s.id]}
                    </span>
                  )}
                  <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" />
                </summary>
                {job.stagePreviews[s.id] && (
                  <div className="border-t px-3 py-3">
                    <StagePreviewBody preview={job.stagePreviews[s.id]!} />
                  </div>
                )}
              </details>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StagePreviewBody({
  preview,
  compact,
}: {
  preview: StagePreview;
  compact?: boolean;
}) {
  const maxH = compact ? "max-h-44" : "max-h-72";
  if (preview.kind === "page_text") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            page {preview.page_number}
          </Badge>
          <span className="text-[10px] text-muted-foreground truncate">
            {preview.label}
          </span>
        </div>
        <pre
          className={cn(
            "whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground/90 overflow-auto rounded bg-muted/40 p-2.5",
            maxH,
          )}
        >
          {preview.text || (
            <span className="italic text-muted-foreground">(empty page)</span>
          )}
        </pre>
        {preview.more && (
          <p className="text-[10px] text-muted-foreground italic">
            Truncated for preview — full text in the library.
          </p>
        )}
      </div>
    );
  }
  if (preview.kind === "page_clean") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {preview.section_kind && (
            <Badge variant="info" className="text-[10px] px-1.5 py-0 h-4">
              {preview.section_kind}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            page {preview.page_number}
          </Badge>
          {preview.section_title && (
            <span className="text-[11px] font-medium truncate">
              {preview.section_title}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Raw
            </div>
            <pre
              className={cn(
                "whitespace-pre-wrap break-words font-sans text-xs leading-relaxed bg-muted/40 rounded p-2.5 overflow-auto",
                maxH,
              )}
            >
              {preview.raw_text || (
                <span className="italic text-muted-foreground">(empty)</span>
              )}
            </pre>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Cleaned
            </div>
            <pre
              className={cn(
                "whitespace-pre-wrap break-words font-sans text-xs leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded p-2.5 overflow-auto",
                maxH,
              )}
            >
              {preview.cleaned_text || (
                <span className="italic text-muted-foreground">(empty)</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    );
  }
  if (preview.kind === "chunks_sample") {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground truncate">
          {preview.label}
        </div>
        <div className="space-y-2">
          {preview.samples.map((c, i) => (
            <div
              key={c.chunk_index ?? i}
              className="rounded-md border bg-muted/30 p-2.5 space-y-1"
            >
              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  #{c.chunk_index ?? i + 1}
                </Badge>
                {c.chunk_kind && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    {c.chunk_kind}
                  </Badge>
                )}
                {c.token_count != null && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    {c.token_count.toLocaleString()} tok
                  </Badge>
                )}
                {c.page_numbers && c.page_numbers.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    p.{c.page_numbers[0]}
                    {c.page_numbers.length > 1
                      ? `–${c.page_numbers[c.page_numbers.length - 1]}`
                      : ""}
                  </Badge>
                )}
              </div>
              <pre
                className={cn(
                  "whitespace-pre-wrap break-words font-sans text-xs leading-relaxed overflow-auto",
                  compact ? "max-h-24" : "max-h-32",
                )}
              >
                {c.content_text}
              </pre>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function ResultPanel({
  result,
  byStage,
}: {
  result: NonNullable<ProcessingJob["result"]>;
  byStage: ProcessingJob["byStage"];
}) {
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Done</div>
          {result.headline && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.headline}
            </p>
          )}
        </div>
        {result.processedDocumentId && (
          <a
            href={`/rag/library/${result.processedDocumentId}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2 mt-3">
        {STAGES.map((s) => {
          const summary = byStage[s.id] ?? result.byStage[s.id];
          if (!summary) return null;
          const Icon = s.Icon;
          return (
            <div
              key={s.id}
              className="flex items-start gap-1.5 rounded-md border bg-background/60 p-2"
            >
              <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
                <div className="text-xs">{summary}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ErrorPanel({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-destructive">
            Processing failed
          </div>
          <p className="text-xs break-words mt-0.5">{error}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Re-run the stage from the document detail panel — it's idempotent
            and will replace partial output.
          </p>
        </div>
      </div>
    </div>
  );
}

function JobActions({
  job,
  onCancel,
  onDismiss,
}: {
  job: ProcessingJob;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  if (job.status === "running") {
    return (
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[10px] text-muted-foreground">
          Safe to close — processing continues on the server.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="h-7 text-xs"
        >
          <XIcon className="h-3 w-3 mr-1" />
          Stop
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={onDismiss}
        className="h-7 text-xs"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">Nothing processing yet</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Upload a file or re-run a stage to watch live extraction, cleaning,
        chunking, and embedding stream in here.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStageStates(
  job: ProcessingJob,
): Record<ProcessingStageId, "pending" | "running" | "done" | "error"> {
  const out: Record<
    ProcessingStageId,
    "pending" | "running" | "done" | "error"
  > = {
    extract: "pending",
    clean: "pending",
    chunk: "pending",
    embed: "pending",
  };
  if (job.status === "succeeded") {
    for (const s of STAGES) {
      if (job.byStage[s.id] || job.stagePreviews[s.id]) out[s.id] = "done";
    }
    // For full-pipeline jobs, mark every stage done even if previews
    // weren't streamed (some stages don't emit preview).
    if (job.kind === "pipeline") {
      for (const s of STAGES) out[s.id] = "done";
    }
    return out;
  }

  // Mark every stage with a recorded result/preview as done.
  for (const s of STAGES) {
    if (job.byStage[s.id] || job.stagePreviews[s.id]) out[s.id] = "done";
  }

  const active = job.frame?.activeStage;
  if (active) {
    if (job.status === "failed") {
      out[active] = "error";
    } else if (job.status === "running") {
      out[active] = "running";
      // Anything before the active stage that we haven't seen → mark done
      // (the backend skipped emitting them because they were already done).
      let seenActive = false;
      for (const s of STAGES) {
        if (s.id === active) {
          seenActive = true;
          continue;
        }
        if (!seenActive && out[s.id] === "pending") out[s.id] = "done";
      }
    }
  }
  if (job.status === "failed" && !active) {
    out.extract = "error";
  }
  return out;
}
