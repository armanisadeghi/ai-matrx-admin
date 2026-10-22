// row-token: none — draws the steps of a whole-Notion import across its preview and import runs
"use client";

/**
 * NotionJobSteps — a whole-Notion import as ONE list of steps (lane UI1, 2026-10-22).
 *
 * The owner's words: one component that shows all of the steps and makes the person feel in charge.
 * Every step is listed from the first paint — Preview, Your tables, then the import's own stages —
 * each waiting, working with the run's real count ("Tables 41 of 278"), done, or skipped with why.
 * The ONE question (which of their tables a Notion database fills, replaces, or sits beside) is
 * answered here, the safe default (a new table of its own) already chosen; the answer starts the
 * import through the same door the agent uses, and the list follows the import's run from there.
 *
 * Drawn by `BackgroundRunCard` for a preview / start look run and for the import run itself. Pure
 * reading lives in `backgroundRun.ts` (`notionJobSteps`, tested); this file only draws and sends.
 */

import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, CircleDashed, CircleSlash, Pause } from "lucide-react";
import { Skeleton } from "@ai-matrx/design-system";
import { Button, Select } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { useAppSelector } from "@/lib/redux/hooks";
import { postJson } from "@/lib/python-client";
import { extractErrorMessage } from "@/utils/errors";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { selectRunState } from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import type { WorkflowRunState } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import {
  CHOICE_WORDS,
  RATCHET_START,
  advanceRatchet,
  defaultChoices,
  lookOutputOf,
  notionJobSteps,
  readBackgroundRun,
  readChoiceCard,
  startedRunOf,
  type BackgroundRunView,
  type ChoiceCard,
  type JobStep,
} from "./backgroundRun";
import { useRejoinResumedRun } from "./useRejoinResumedRun";

/** Where this browser remembers the import a card's answer started (the start look carries it server-side). */
const NEXT_KEY = (lookRunId: string) => `notion-job:${lookRunId}:import-run`;

function readNext(lookRunId: string): string | null {
  try {
    return window.localStorage.getItem(NEXT_KEY(lookRunId));
  } catch {
    return null;
  }
}

export interface NotionJobStepsProps {
  /** The run the card was drawn for: a preview / start look, or the import itself. */
  run: WorkflowRunState | null;
  runId: string;
  view: BackgroundRunView;
  /** The card's own ratchet stage for an import run (−1: none yet). */
  stageIndex: number;
  /** Draws the finished import's report (totals, every table, every loss, the report link). */
  renderReport: (view: BackgroundRunView) => ReactNode;
}

export function NotionJobSteps({ run, runId, view, stageIndex, renderReport }: NotionJobStepsProps) {
  const isLook = view.kind === "look";
  const lookOutput = isLook ? lookOutputOf(run) : null;
  const card = isLook && view.phase === "finished" ? readChoiceCard(lookOutput) : null;

  // The import this job runs: the look's own start (`run_id`), or the one this card's answer started.
  const [startedHere, setStartedHere] = useState<string | null>(() => (isLook ? readNext(runId) : null));
  const nextRunId = isLook ? startedRunOf(lookOutput) ?? startedHere : null;
  useWorkflowRun(nextRunId);
  const nextRun = useAppSelector((state) => (nextRunId ? selectRunState(nextRunId)(state) : null));
  const importRun = isLook ? nextRun : run;
  const importView = isLook ? (nextRunId ? readBackgroundRun(nextRun, "import") : null) : view;
  useRejoinResumedRun(nextRunId, importView?.phase === "resuming");

  // The followed import's own ratchet (the card's ratchet is the look's when this card is a look).
  const [ratchet, setRatchet] = useState(RATCHET_START);
  const next = advanceRatchet(ratchet, importView?.sample ?? null, importView?.phase === "finished");
  if (isLook && next !== ratchet) setRatchet(next);
  const at = isLook ? ratchet.stageIndex : stageIndex;

  // Counts each stage last showed while this card watched (a done step keeps its number).
  // Adjusted during render (like the ratchet), so a new count and its row land in the same paint.
  const [remembered, setRemembered] = useState<Record<number, { current: number | null; total: number | null }>>({});
  const sample = importView?.sample;
  if (sample && sample.stageIndex != null && !sample.waiting && (sample.current != null || sample.total != null)) {
    const kept = remembered[sample.stageIndex];
    if (!kept || kept.current !== sample.current || kept.total !== sample.total) {
      setRemembered({ ...remembered, [sample.stageIndex]: { current: sample.current, total: sample.total } });
    }
  }

  const [choices, setChoices] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const chosen = card ? { ...defaultChoices(card), ...choices } : {};

  const start = async () => {
    if (!card) return;
    setStarting(true);
    setRefused(null);
    try {
      const onto = Object.fromEntries(Object.entries(chosen).filter(([, value]) => value !== "new"));
      const { data } = await postJson<{ run_id?: string }, { preview_token: string; onto: Record<string, string>; look_run_id: string }>(
        "/notion-import/workspace/start",
        { preview_token: card.previewToken, onto, look_run_id: runId },
      );
      if (!data.run_id) throw new Error("The import did not start.");
      try {
        window.localStorage.setItem(NEXT_KEY(runId), data.run_id);
      } catch {
        // Not kept for a reload in this browser; the import still runs and the chat is woken at its end.
      }
      setStartedHere(data.run_id);
    } catch (err) {
      setRefused(extractErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const steps = notionJobSteps({
    look: isLook ? view : null,
    lookOutput,
    card: nextRunId ? null : card,
    starting,
    startRefused: refused,
    run: importView,
    runInput: importRun?.input ?? null,
    stageIndex: at,
    remembered,
  });

  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="Import steps" className="flex flex-col">
        {steps.map((step) => (
          <li key={step.id} className="flex flex-col">
            <StepRow step={step} />
            {step.id === "choice" && step.state === "needs_you" && card ? (
              <ChoicePanel card={card} chosen={chosen} onChoose={(id, value) => setChoices((prev) => ({ ...prev, [id]: value }))} onStart={start} starting={starting} />
            ) : null}
          </li>
        ))}
      </ol>
      {importView?.phase === "finished" ? renderReport(importView) : null}
    </div>
  );
}

function StepIcon({ step }: { step: JobStep }) {
  if (step.state === "done") return <Check className="size-3.5 text-success" aria-hidden />;
  if (step.state === "stopped") return <AlertTriangle className="size-3.5 text-destructive" aria-hidden />;
  if (step.state === "skipped") return <CircleSlash className="size-3.5 text-muted-foreground" aria-hidden />;
  if (step.state === "working" && step.held) return <Pause className="size-3.5 text-warning" aria-hidden />;
  if (step.state === "working" || step.state === "needs_you") {
    return <span className={`size-2 rounded-full ${step.state === "needs_you" ? "bg-primary" : "animate-pulse bg-primary"}`} aria-hidden />;
  }
  return <CircleDashed className="size-3.5 text-muted-foreground/60" aria-hidden />;
}

const STATE_WORD: Record<JobStep["state"], string> = {
  waiting: "Waiting",
  working: "Working",
  needs_you: "Your answer",
  done: "Done",
  skipped: "Skipped",
  stopped: "Stopped",
};

function StepRow({ step }: { step: JobStep }) {
  const active = step.state === "working" || step.state === "needs_you";
  const counted = step.current != null && step.total != null && step.total > 0;
  const count = counted
    ? `${formatCount(step.current ?? 0)} of ${formatCount(step.total ?? 0)}`
    : step.state === "done" && step.current != null
      ? formatCount(step.current)
      : "";
  return (
    <div
      className="flex h-7 items-center gap-2"
      aria-label={`${step.label}: ${STATE_WORD[step.state]}${step.note ? `, ${step.note}` : ""}`}
      aria-current={active ? "step" : undefined}
      data-step-state={step.state}
    >
      <span className="flex size-4 shrink-0 items-center justify-center"><StepIcon step={step} /></span>
      <span className={`type-secondary w-24 shrink-0 ${step.state === "waiting" ? "text-muted-foreground" : "font-medium text-foreground"}`}>{step.label}</span>
      <span className={`type-secondary min-w-0 flex-1 truncate ${step.held ? "text-warning" : "text-muted-foreground"}`} title={step.note ?? undefined}>
        {step.state === "working" && !step.note && !counted ? <Skeleton motion="shimmer" shape="line" width="1/3" aria-label="Working" /> : step.note ?? ""}
      </span>
      <span className="type-meta shrink-0 tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

function ChoicePanel({ card, chosen, onChoose, onStart, starting }: {
  card: ChoiceCard;
  chosen: Record<string, string>;
  onChoose: (notionId: string, value: string) => void;
  onStart: () => void;
  starting: boolean;
}) {
  return (
    <div className="ml-6 flex flex-col gap-2 border-l border-border pb-2 pl-3">
      {card.proposals.map((p) => (
        <div key={p.notionId} className="flex min-h-8 items-center gap-2">
          <span className="type-secondary min-w-0 flex-1 truncate text-foreground" title={p.replaceRefused ?? p.why ?? undefined}>
            {p.notionDatabase}
            <span className="text-muted-foreground"> · yours: {p.tableName ?? "a table"}</span>
          </span>
          <Select
            value={chosen[p.notionId] ?? "new"}
            onValueChange={(value) => onChoose(p.notionId, value)}
            options={p.options.map((o) => ({ value: o.value, label: CHOICE_WORDS[o.key] ?? o.key }))}
            aria-label={`${p.notionDatabase}: what to do with your table`}
          />
        </div>
      ))}
      <div className="flex items-center justify-end">
        <Button variant="primary" onClick={onStart} disabled={starting}>
          {starting ? "Starting" : "Start import"}
        </Button>
      </div>
    </div>
  );
}
