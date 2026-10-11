"use client";

// features/education/study/learning-gain/components/LearningGainReportView.tsx
//
// The pre/post learning-gain report (P5) — "prove it makes you smarter." Reads
// P1's baseline/post rows — only the learner's own completed measurements,
// never sample data — and renders per-subject deltas + normalized gain, the
// baselines still waiting for a post-test, and a print / save-as-PDF export
// (browser print → PDF; chrome is `print:hidden`).
//
// React Compiler is on: no manual memo.

import { printLivePage } from "@ai-matrx/rich-content/mermaid/lazy-draw";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  TrendingUp,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createEducationProgressScope } from "@/features/surfaces/manifests/education-progress.manifest";
import { learningGainService } from "../learningGainService";
import type {
  LearningGainPair,
  LearningGainReport,
  LearningGainRow,
} from "../types";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { Chip } from "@ai-matrx/design-system/controls";

const SURFACE_NAME = "matrx-user/education-progress";
/** Any quiz can be taken as a baseline ("Measure my learning gain"). */
const TAKE_BASELINE_HREF = "/education/quizzes";

export function LearningGainReportView({
  backHref = "/education/progress",
}: {
  backHref?: string;
}) {
  const router = useRouter();
  const [report, setReport] = useState<LearningGainReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read at trigger time, never from stale closure state.
  const buildScope = () =>
    createEducationProgressScope({
      view: "learning_gain",
      gain_loading: loading,
      gain_error: error ?? undefined,
      ...(loading || !report
        ? {}
        : {
            gain_pairs: report.pairs,
            gain_overall_delta: report.overallDelta ?? undefined,
            gain_overall_normalized: report.overallNormalizedGain ?? undefined,
          }),
    });

  useEffect(() => {
    let cancelled = false;
    void learningGainService.getReport().then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error);
      else setReport(res.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overallGainPct =
    report?.overallNormalizedGain != null
      ? Math.round(report.overallNormalizedGain * 100)
      : null;
  const overallDeltaPct =
    report?.overallDelta != null ? Math.round(report.overallDelta * 100) : null;

  return (
    <SurfaceRuntimeProvider surfaceName={SURFACE_NAME} getScope={buildScope}>
    <div className="min-h-full w-full bg-textured print:bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 print:py-0">
        <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
          <Button
            icon={<ArrowLeft />}
            variant="quiet"
            onClick={() => (backHref ? router.push(backHref) : router.back())}
          >
            Back
          </Button>
          {report && report.pairs.length > 0 && (
            <Button
              icon={<Printer />}
              variant="outline"
              onClick={() => void printLivePage()}
            >
              Print / Save as PDF
            </Button>
          )}
        </div>

        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">
            Learning-gain report
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-14 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-foreground">Couldn&apos;t load the report <ErrorAlchemyMenu /></p>
            <p className="max-w-md text-xs text-muted-foreground">{error} <ErrorAlchemyMenu error={error} /></p>
          </div>
        ) : !report ||
          (report.pairs.length === 0 && report.awaitingPost.length === 0) ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm text-foreground">
              No baseline yet, so there is no gain to measure.
            </p>
            <Button variant="outline" asChild>
              <Link href={TAKE_BASELINE_HREF}>
                <ClipboardCheck className="h-4 w-4" />
                Take a baseline
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {report.pairs.length > 0 && (
            <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Average improvement
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-primary">
                {overallDeltaPct != null ? `+${overallDeltaPct}` : "—"}
                <span className="text-lg font-medium text-muted-foreground">
                  {" "}
                  points
                </span>
              </p>
              {overallGainPct != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You closed{" "}
                  <span className="font-semibold text-foreground">
                    {overallGainPct}%
                  </span>{" "}
                  of the gap to mastery.
                </p>
              )}
            </section>

            )}

            {/* Per-subject pre → post */}
            {report.pairs.length > 0 && (
            <section className="flex flex-col gap-3">
              {report.pairs.map((pair) => (
                <SubjectRow key={pair.subject} pair={pair} />
              ))}
            </section>
            )}

            {/* Baselines measured, post-test not taken yet */}
            {report.awaitingPost.length > 0 && (
              <section className="flex flex-col gap-2">
                {report.awaitingPost.map((row) => (
                  <BaselineRow key={row.id} row={row} />
                ))}
              </section>
            )}

            {/* Improvement = post − baseline. Gap closed = Hake's normalized
                gain (post − pre) ÷ (1 − pre): the share of what was left to
                learn that was learned. */}
            {report.pairs.length > 0 && (
              <p
                className="text-[11px] text-muted-foreground"
                title="Gap closed is (post − pre) ÷ (1 − pre), the share of what was left to learn."
              >
                Gap closed uses normalized gain (Hake&apos;s g)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
    </SurfaceRuntimeProvider>
  );
}

function BaselineRow({ row }: { row: LearningGainRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {row.subjectLabel ?? row.subject}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Baseline · {formatDate(row.takenAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {Math.round(row.score * 100)}%
        </span>
        <Chip tone="neutral" label="Post-test pending" />
      </div>
    </div>
  );
}

function SubjectRow({ pair }: { pair: LearningGainPair }) {
  const basePct = Math.round(pair.baseline.score * 100);
  const postPct = Math.round(pair.post.score * 100);
  const deltaPct = Math.round(pair.delta * 100);
  const positive = deltaPct >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-foreground">
          {pair.subjectLabel}
        </span>
        <Chip
          tone={positive ? "success" : "destructive"}
          label={`${positive ? "+" : ""}${deltaPct} pts`}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
          {basePct}%
        </span>
        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
          {/* baseline fill (muted) with the post gain layered on top */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/30"
            style={{ width: `${basePct}%` }}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              positive ? "bg-primary" : "bg-red-500",
            )}
            style={{ width: `${postPct}%`, opacity: 0.75 }}
          />
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="w-10 shrink-0 tabular-nums font-medium text-foreground">
          {postPct}%
        </span>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>Baseline · {formatDate(pair.baseline.takenAt)}</span>
        <span>Post · {formatDate(pair.post.takenAt)}</span>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
