"use client";

// The topic's analyses in THE annotated reader: every analysis in one outline
// (named by its source, most important first; empty or failed ones under
// "Needs attention"), the open one unfolded into its sections, the full
// reading set on its text. Run / retry act on the set (left header); Retry and
// Open source act on the open one; its facts and the topic's totals are in
// Details.

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Layout } from "react-resizable-panels";
import { AlertCircle, ArrowUpRight, Brain, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { ReaderDetails, detailDate } from "@/features/rich-document/reader/ReaderDetails";
import { readableTitle } from "@/features/rich-document/reader/ReaderLibrary";
import { ReadFailure, Skeleton } from "@ai-matrx/design-system";
import { AiModelRef } from "@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef";
import { Cost } from "@/components/cost/Cost";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useFloatingLiveRun } from "@/features/overlays/openers/liveRunWindow";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useTopicContext, useStreamDebug } from "../../context/ResearchContext";
import { useAnalysesForTopic, useResearchSources, useSourceImportance } from "../../hooks/useResearchState";
import { useResearchApi } from "../../hooks/useResearchApi";
import { useResearchStream } from "../../hooks/useResearchStream";
import { StoppedEarlyNote } from "../shared/StoppedEarlyNote";
import { ResearchRecordReader, type ResearchReaderRecord } from "../reader/ResearchRecordReader";
import { type ResearchAnalysis, type ResearchDataEvent, type ResearchSource, tokenUsageFromJson } from "../../types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/** A string with real (non-whitespace) content. */
const hasText = (s: string | null | undefined): s is string => !!s && s.trim().length > 0;

/** Analysis that genuinely produced content (success + non-empty result). */
const isDoneAnalysis = (a: ResearchAnalysis): boolean => a.status === "success" && hasText(a.result);

const tokensShort = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n > 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

/** The open analysis's facts, then the whole set's totals — never above the text. */
function AnalysisDetails({
  analysis,
  source,
  totals,
}: {
  analysis: ResearchAnalysis;
  source: ResearchSource | undefined;
  totals: { total: number; withContent: number; empty: number; failed: number; totalCost: number; totalTokens: number };
}) {
  const usage = tokenUsageFromJson(analysis.token_usage);
  return (
    <ReaderDetails
      sections={[
        {
          title: "This analysis",
          rows: [
            !!source?.url && { label: "Page", value: <OutboundLink href={source.url} className="text-primary hover:underline">{source.hostname ?? "Open"}</OutboundLink> },
            analysis.status !== "success" && { label: "Status", value: <span className="capitalize">{analysis.status}</span> },
            { label: "Written", value: detailDate(analysis.created_at) },
            !!analysis.model_id && { label: "Model", value: <AiModelRef modelId={analysis.model_id} showIcon={false} disableNavigation /> },
            !!usage && { label: "Tokens", value: usage.totalTokens.toLocaleString() },
            usage?.costUsd != null && usage.costUsd > 0 && { label: "Cost", value: <Cost usd={usage.costUsd} short /> },
          ],
        },
        {
          title: "All analyses",
          rows: [
            { label: "Analyses", value: totals.total },
            { label: "With content", value: totals.withContent },
            totals.empty > 0 && { label: "Empty", value: totals.empty },
            totals.failed > 0 && { label: "Failed", value: totals.failed },
            { label: "Cost", value: <Cost usd={totals.totalCost} short /> },
            { label: "Tokens", value: tokensShort(totals.totalTokens) },
          ],
        },
      ]}
    />
  );
}

/** An open analysis with no text: a failure (with its reason) or an honest empty result. */
function AnalysisWithoutText({ analysis, title }: { analysis: ResearchAnalysis; title: string }) {
  return (
    <div>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {analysis.status === "failed" ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2 type-secondary text-destructive-ink">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{analysis.error || "The analysis failed."}</span>
          <ErrorAlchemyMenu error={analysis.error ?? undefined} />
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 type-secondary text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>This page produced no summary — usually too little usable text. Re-read it or retry.</span>
        </div>
      )}
    </div>
  );
}

export default function AnalysisList({ defaultLayout }: { defaultLayout?: Layout }) {
  const { topicId } = useTopicContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const api = useResearchApi();
  const debug = useStreamDebug();
  const stream = useResearchStream();

  const { data: analyses, isLoading, error: analysesError, refresh: refetchAnalyses } = useAnalysesForTopic(topicId);
  const { data: sources } = useResearchSources(topicId, { limit: 500 });
  const { data: importanceMap } = useSourceImportance(topicId);

  const [streamingLabel, setStreamingLabel] = useState("");
  const [retrying, setRetrying] = useState(false);

  // The live analysis stream is ADOPTED (see `useResearchStream`) and rendered
  // by the canonical floating live-run window off this request id — never
  // hand-painted into the page, which would also shift it on every run.
  useFloatingLiveRun({
    active: stream.isStreaming,
    instanceId: `research-analyze-all:${topicId}`,
    requestId: stream.requestId,
    label: streamingLabel || "Analyzing sources",
  });

  const analysisList = (analyses ?? []) as ResearchAnalysis[];
  const sourceMap = useMemo(() => {
    const map = new Map<string, ResearchSource>();
    for (const s of (sources ?? []) as ResearchSource[]) map.set(s.id, s);
    return map;
  }, [sources]);

  // Most important source first (multi-keyword importance, then best rank) —
  // NOT the ambiguous rs_source.rank. Empty and failed ones are listed apart.
  const impOf = (a: ResearchAnalysis) => importanceMap?.get(a.source_id);
  const doneItems = analysisList.filter(isDoneAnalysis).sort((a, b) => {
    const ia = impOf(a);
    const ib = impOf(b);
    const sb = ib?.score ?? 0;
    const sa = ia?.score ?? 0;
    if (sb !== sa) return sb - sa;
    return (ia?.bestRank ?? Number.POSITIVE_INFINITY) - (ib?.bestRank ?? Number.POSITIVE_INFINITY);
  });
  const incompleteItems = analysisList.filter((a) => !isDoneAnalysis(a));

  const totals = useMemo(() => {
    let totalCost = 0;
    let totalTokens = 0;
    for (const a of analysisList) {
      // Successful calls only — the same rule the cost ledger and the backend use.
      if (a.status !== "success") continue;
      const u = tokenUsageFromJson(a.token_usage);
      if (u) {
        totalCost += u.costUsd ?? 0;
        totalTokens += u.totalTokens;
      }
    }
    return {
      total: analysisList.length,
      withContent: analysisList.filter(isDoneAnalysis).length,
      empty: analysisList.filter((a) => a.status === "success" && !hasText(a.result)).length,
      failed: analysisList.filter((a) => a.status === "failed").length,
      totalCost,
      totalTokens,
    };
  }, [analysisList]);

  const titleOf = (a: ResearchAnalysis) => {
    const source = sourceMap.get(a.source_id);
    return readableTitle(source?.title || source?.hostname || "Untitled source");
  };

  const requested = searchParams.get("record");
  const ordered = [...doneItems, ...incompleteItems];
  const selected = ordered.find((a) => a.id === requested) ?? doneItems[0] ?? ordered[0] ?? null;
  const selectAnalysis = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("record", id);
    replaceAddressWithoutNavigating(`${pathname}?${next.toString()}`);
  };

  const library = {
    groups: [
      { label: "Analyses", items: doneItems.map((a) => ({ id: a.id, title: titleOf(a), content: a.result ?? "" })) },
      { label: "Needs attention", items: incompleteItems.map((a) => ({ id: a.id, title: titleOf(a), content: a.result ?? "", flag: a.status === "failed" ? "Failed" : "Empty" })) },
    ].filter((g) => g.items.length > 0),
    activeId: selected?.id ?? null,
    onSelect: selectAnalysis,
    summary: [`${totals.withContent} of ${totals.total} with content`, incompleteItems.length ? `${incompleteItems.length} need attention` : ""].filter(Boolean).join(" · "),
  };

  const handleAnalyzeAll = async () => {
    // A paid AI run states what it does before it starts.
    if (!(await confirm({ title: "Analyze sources?", description: "Reads every included source that has no analysis yet — a paid AI run, one call per source.", confirmLabel: "Analyze" }))) return;
    setStreamingLabel("Analyzing all sources...");
    // The controller must be the FETCH's own so the watchdog (and cancel)
    // actually closes the body — see `StartStreamOptions.abortController`.
    const controller = new AbortController();
    const res = await api.analyzeAll(topicId, undefined, controller.signal);
    stream.startStream(
      res,
      {
        onData: (payload: ResearchDataEvent) => {
          if (payload.type === "analysis_start") {
            setStreamingLabel(`Analyzing source ${payload.total > 0 ? `(${payload.total} remaining)` : ""}...`);
          }
          if (payload.type === "analysis_complete" || payload.type === "analysis_failed") refetchAnalyses();
          if (payload.type === "analyze_all_complete") {
            setStreamingLabel("");
            refetchAnalyses();
          }
        },
        onEnd: () => {
          setStreamingLabel("");
          refetchAnalyses();
        },
      },
      { abortController: controller },
    );
    debug.pushEvents(stream.rawEvents, "analyze-all");
  };

  const handleRetryAll = async () => {
    if (!(await confirm({ title: `Retry ${totals.failed} failed analyses?`, description: "Runs each failed analysis again — a paid AI run, one call per source.", confirmLabel: "Retry" }))) return;
    await api.retryFailedAnalyses(topicId);
    refetchAnalyses();
  };

  const handleRetryOne = async (analysis: ResearchAnalysis) => {
    if (!(await confirm({ title: "Retry this analysis?", description: "Reads this source again — a paid AI run.", confirmLabel: "Retry" }))) return;
    setRetrying(true);
    try {
      await api.retryAnalysis(topicId, analysis.id);
      refetchAnalyses();
    } finally {
      setRetrying(false);
    }
  };

  const panelActions = (
    <>
      <Button
        variant="quiet"
        icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <Brain aria-hidden />}
        aria-label="Analyze sources"
        title="Analyze every source still without an analysis (a paid AI run)"
        onClick={() => void handleAnalyzeAll()}
        disabled={stream.isStreaming}
      />
      {totals.failed > 0 && (
        <Button variant="quiet" icon={<RefreshCw aria-hidden />} aria-label={`Retry ${totals.failed} failed`} title={`Retry the ${totals.failed} failed analyses (a paid AI run)`} onClick={() => void handleRetryAll()} disabled={stream.isStreaming} />
      )}
    </>
  );

  const selectedSource = selected ? sourceMap.get(selected.source_id) : undefined;
  const toolbar = selected ? (
    <>
      {selected.status === "failed" && (
        <Button variant="quiet" icon={retrying ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} aria-label="Retry this analysis" title="Retry this analysis (a paid AI run)" onClick={() => void handleRetryOne(selected)} disabled={retrying} />
      )}
      {selectedSource && (
        <Button asChild variant="quiet" icon={<ArrowUpRight aria-hidden />} aria-label="Open the source" title="Open the source">
          <Link href={`/research/topics/${topicId}/sources/${selectedSource.id}`} />
        </Button>
      )}
    </>
  ) : undefined;

  const readerRecord: ResearchReaderRecord | null =
    selected && hasText(selected.result)
      ? {
          type: "research_analysis",
          id: selected.id,
          title: titleOf(selected),
          version: 1,
          kind: "analysis",
          body: selected.result,
          href: `/research/topics/${topicId}/analysis?record=${selected.id}`,
        }
      : null;

  const placeholder = isLoading ? (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  ) : analysesError && analysisList.length === 0 ? (
    <ReadFailure error={analysesError} what="this topic's analyses" onRetry={refetchAnalyses} />
  ) : selected ? (
    <AnalysisWithoutText analysis={selected} title={titleOf(selected)} />
  ) : (
    <EmptyState
      icon={<Brain aria-hidden />}
      title="No analyses yet"
      line="Read your sources with AI to pull out their key points."
      action={
        <Button variant="primary" icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <Brain aria-hidden />} onClick={() => void handleAnalyzeAll()} disabled={stream.isStreaming}>
          Analyze all sources
        </Button>
      }
    />
  );

  return (
    <ResearchRecordReader
      groupKey="research-analysis-reader"
      defaultLayout={defaultLayout}
      record={readerRecord}
      panelLabel="Analysis"
      panelActions={<div className="flex items-center">{panelActions}</div>}
      library={library}
      toolbar={toolbar}
      header={readerRecord && selected?.status === "failed" ? <StoppedEarlyNote reason={selected.error || "Analysis stopped early."} /> : undefined}
      placeholder={placeholder}
      details={selected ? <AnalysisDetails analysis={selected} source={selectedSource} totals={totals} /> : undefined}
    />
  );
}
