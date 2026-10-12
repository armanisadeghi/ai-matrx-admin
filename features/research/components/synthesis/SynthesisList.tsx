"use client";

import { readOf } from "@ai-matrx/design-system";
import { useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Layout } from "react-resizable-panels";
import { Button, EmptyState, PropertyRow } from "@ai-matrx/design-system/controls";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { documentTitleOf } from "@/features/rich-document/reader/ReaderLibrary";
import { ResearchRecordReader, type ResearchReaderRecord } from "../reader/ResearchRecordReader";
import {
  Layers,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { useTopicContext, useStreamDebug } from "../../context/ResearchContext";
import {
  useResearchSynthesis,
  useResearchKeywords,
} from "../../hooks/useResearchState";
import { useResearchApi } from "../../hooks/useResearchApi";
import { useResearchStream } from "../../hooks/useResearchStream";
import { StoppedEarlyNote } from "../shared/StoppedEarlyNote";
import { SynthesisVersionHistory } from "./SynthesisVersionHistory";
import { AiModelRef } from "@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef";
import { deriveReadiness } from "../../readiness";
import type { ResearchSynthesis, ResearchDataEvent } from "../../types";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { AnswerValueView } from "@/components/official/structured-value/AnswerValueView";
import { buildApplicationScopeFromMenuContext } from "@ai-matrx/context-menu/engine";
import {
  normalizeSynthesisScope,
  TOPIC_SYNTHESIS_WIRE_SCOPE,
} from "../../types";
import {
  buildResearchContextData,
  RESEARCH_CONTEXT_MENU_PROPS,
} from "../../agent-context/buildResearchContextData";

/** A string with real (non-whitespace) content. */
// Universal v3 context menu — lightweight shell, imported statically;
// MenuContent lazy-loads on first open.
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { csvExportItem, jsonExportItem } from "@/components/agent-copy/export";
import type { AiOptionValues } from "@/components/agent-copy/AiCopyMenu";
import {
  researchKpiAttributes,
  researchKpis,
  researchLocation,
  synthesesListSummary,
  synthesisBrief,
  synthesisSummary,
  SYNTHESIS_CSV_COLUMNS,
} from "@/features/research/copy";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";

const hasText = (s: string | null | undefined): s is string =>
  !!s && s.trim().length > 0;

/** A status that means the work is done (so an empty body is final, not pending). */
const isTerminalStatus = (status: string): boolean =>
  status === "success" || status === "complete" || status === "failed";

/**
 * Structured output as fenced JSON TEXT — for the agent context only (a
 * right-click agent reads the synthesis as text). Never for display: the
 * screen draws `result_structured` through `AnswerValueView`.
 */
const structuredToMarkdown = (data: unknown): string => {
  try {
    const s = JSON.stringify(data, null, 2);
    const clipped =
      s.length > 20000 ? `${s.slice(0, 20000)}\n… (truncated)` : s;
    return `\`\`\`json\n${clipped}\n\`\`\``;
  } catch {
    return "_Structured output could not be displayed._";
  }
};

function synthesisKind(s: ResearchSynthesis): string {
  return normalizeSynthesisScope(s.scope) === "topic" ? "topic report" : "keyword synthesis";
}

/** This synthesis's copy pair (human + agent payload), in the reader's action row. */
function SynthesisCopy({ synthesis, label }: { synthesis: ResearchSynthesis; label: string }) {
  const { progress } = useTopicContext();
  const kpis = researchKpis(progress, null);
  return (
    <CopyButtons
      size="icon"
      label={`Synthesis — ${label}`}
      human={() => synthesisSummary(synthesis)}
      agent={() => ({
        kind: "research-synthesis",
        location: researchLocation("Synthesis"),
        description: `A single research synthesis (${synthesis.scope}) as rendered on the synthesis page.`,
        // Full result, never a display clip — the payload must not lie to the agent.
        data: { synthesis, page_kpis: kpis },
        summary: synthesisSummary(synthesis),
        attributes: {
          ...researchKpiAttributes(kpis),
          synthesis_id: synthesis.id,
          scope: synthesis.scope,
          status: synthesis.status,
          version: synthesis.capture_version,
          result_chars: synthesis.result?.length ?? 0,
        },
      })}
      json={() => synthesis}
    />
  );
}

/** The synthesis's facts — kind, status, version, when, model, size — out of the reading surface. */
function SynthesisDetails({ synthesis }: { synthesis: ResearchSynthesis }) {
  return (
    <div className="grid gap-1">
      <PropertyRow label="Kind" value={<span className="capitalize">{synthesisKind(synthesis)}</span>} />
      <PropertyRow label="Status" value={<span className="capitalize">{synthesis.status}</span>} />
      {synthesis.capture_version != null && <PropertyRow label="Version" value={`v${synthesis.capture_version}`} />}
      <PropertyRow label="Written" value={synthesis.created_at ? new Date(synthesis.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Unknown"} />
      {synthesis.model_id && <PropertyRow label="Model" value={<AiModelRef modelId={synthesis.model_id} showIcon={false} disableNavigation />} />}
      <PropertyRow label="Length" value={`${(synthesis.result?.length ?? 0).toLocaleString()} characters`} />
    </div>
  );
}

/** A selected synthesis with no text to read: structured output, a failure, empty, or still running. */
function SynthesisWithoutText({ synthesis, label }: { synthesis: ResearchSynthesis; label: string }) {
  const { topic, progress } = useTopicContext();
  if (synthesis.result_structured) {
    // Completed with structured-only output — surface it honestly rather than
    // showing nothing for a paid-for call.
    const contextData = buildResearchContextData({
      topic,
      progress,
      primaryText: structuredToMarkdown(synthesis.result_structured),
      synthesisText: structuredToMarkdown(synthesis.result_structured),
      displayTitle: label,
    });
    return (
      <div>
        {synthesis.status === "failed" && <StoppedEarlyNote reason={synthesis.error || "Synthesis stopped early."} />}
        <NonEditableContextMenu
          {...RESEARCH_CONTEXT_MENU_PROPS}
          getApplicationScope={() =>
            buildApplicationScopeFromMenuContext({
              selectedText: typeof window !== "undefined" ? (window.getSelection()?.toString() ?? "") : "",
              selectionRange: null,
              contextData,
            })
          }
          contextData={contextData}
        >
          <div>
            <AnswerValueView value={synthesis.result_structured} />
          </div>
        </NonEditableContextMenu>
      </div>
    );
  }
  if (synthesis.error) {
    // No content at all + an error → a real failure.
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 type-secondary text-destructive-ink">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {synthesis.error}
        <ErrorAlchemyMenu error={synthesis.error} />
      </div>
    );
  }
  if (isTerminalStatus(synthesis.status)) {
    // Terminal but empty — be explicit instead of an endless spinner.
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 type-secondary text-amber-700 dark:text-amber-400">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>This synthesis finished with no text. Run it again to regenerate it.</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 py-3 type-secondary text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Processing...
    </div>
  );
}

export default function SynthesisList({ defaultLayout }: { defaultLayout?: Layout }) {
  const { topicId, progress, refreshProgress } = useTopicContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Shared ledger — never re-derived locally (see `readiness.ts`).
  const reportStale = deriveReadiness(progress).report.readiness === "stale";
  const api = useResearchApi();
  const debug = useStreamDebug();
  const stream = useResearchStream();

  const {
    data: allSyntheses,
    isLoading: synthLoading,
    error: synthError,
    refresh: refetchSyntheses,
  } = useResearchSynthesis(topicId);
  const { data: keywords } = useResearchKeywords(topicId);

  const [streamingText, setStreamingText] = useState("");
  const [streamingLabel, setStreamingLabel] = useState("");


  const synthList = (allSyntheses ?? []) as ResearchSynthesis[];
  const kwList = keywords ?? [];

  const getKeywordLabel = (kwId: string | null) => {
    if (!kwId) return "Unknown Keyword";
    const kw = kwList.find((k) => k.id === kwId);
    return kw ? kw.keyword : "Keyword";
  };

  // Every synthesis is in the reader's library; copy/export act on all of them.
  const filtered = synthList;

  // Topic-wide syntheses: normalized so legacy scope="project" rows are
  // included (PHASE-4 COMPAT).
  const topicSyntheses = filtered.filter(
    (s) => normalizeSynthesisScope(s.scope) === "topic",
  );
  const keywordSyntheses = filtered.filter((s) => s.scope === "keyword");

  /**
   * Write the topic report.
   *
   * `initial` is the plain "produce one" path. `update` folds new material
   * into the existing report; `rebuild` rewrites it from every included
   * source. Both of the latter mark the current row superseded and insert a
   * new version — the prior text survives and is readable via
   * `SynthesisVersionHistory`, which is what lets the UI honestly promise the
   * old report is kept.
   */
  const handleRunTopicSynthesis = async (
    iterationMode: "initial" | "update" | "rebuild" = "initial",
  ) => {
    setStreamingText("");
    setStreamingLabel("");
    const res = await api.synthesize(topicId, {
      // Wire scope is the compat constant until backend Phase 3 accepts "topic".
      scope: TOPIC_SYNTHESIS_WIRE_SCOPE,
      iteration_mode: iterationMode,
      use_user_agent_overrides: false,
    });
    stream.startStream(res, {
      onData: (payload: ResearchDataEvent) => {
        if (payload.type === "synthesis_start") {
          // New LLM call starting — reset streaming buffer and label
          setStreamingText("");
          setStreamingLabel(
            payload.scope === "keyword" && payload.keyword
              ? `Keyword: ${payload.keyword}`
              : "Topic Report",
          );
        }
        if (payload.type === "synthesis_complete") {
          // Synthesis done — clear streaming state, refetch from DB for the full row
          setStreamingText("");
          setStreamingLabel("");
          refetchSyntheses();
        }
        if (payload.type === "synthesis_failed") {
          setStreamingText("");
          setStreamingLabel("");
        }
      },
      onChunk: (text) => setStreamingText((prev) => prev + text),
      onEnd: () => {
        setStreamingText("");
        setStreamingLabel("");
        // Final sync — including the readiness ledger, so the out-of-date
        // banner clears the moment the new report lands.
        refetchSyntheses();
        void refreshProgress();
      },
    });
    debug.pushEvents(stream.rawEvents, "synthesize");
  };

  const runButton = (
    <Button
      variant="quiet"
      icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
      aria-label="Run synthesis"
      title="Run synthesis — writes any syntheses still missing (a paid AI run)"
      onClick={() => void handleRunTopicSynthesis("initial")}
      disabled={stream.isStreaming}
    />
  );

  // ── Copy / export ───────────────────────────────────────────────────────
  //
  // Syntheses are long-form documents, so this list can easily reach tens of
  // thousands of chars — the sized-to-data call here is a dropdown PLUS a
  // custom composer whose main lever is a per-synthesis char cap.
  const listKpis = researchKpis(progress, null);
  const listAttributes = () => ({
    ...researchKpiAttributes(listKpis),
    shown: filtered.length,
    total: synthList.length,
    topic_syntheses: topicSyntheses.length,
    keyword_syntheses: keywordSyntheses.length,
  });

  /** The custom composer's row set — shared by `build` and `wrap` so the
   *  preview the user sizes is exactly what lands on the clipboard. */
  const customRows = (opts: AiOptionValues) => {
    const resultChars = Number(opts.resultChars ?? 800);
    let rows = filtered;
    if (opts.failedOnly) rows = rows.filter((s) => !!s.error);
    if (opts.currentOnly) rows = rows.filter((s) => s.is_current);
    return rows.map((s) => synthesisBrief(s, resultChars));
  };

  const copyControls = (
    <>
      <CopyButtons
        size="icon"
        label="Syntheses"
        // ONE menu: copy, transform and export (JSON + CSV of every synthesis, full text).
        export={{
          items: [
            jsonExportItem(() => ({ page_kpis: listKpis, syntheses: filtered })),
            csvExportItem(() => filtered.map((s) => synthesisBrief(s, 0)), "CSV (all)", SYNTHESIS_CSV_COLUMNS),
          ],
        }}
        human={() => synthesesListSummary(filtered)}
        agent={() => ({
          kind: "research-syntheses",
          location: researchLocation("Synthesis"),
          description:
            "Every synthesis on this topic, with full result text.",
          data: {
            page_kpis: listKpis,
            topic_syntheses: topicSyntheses,
            keyword_syntheses: keywordSyntheses,
          },
          summary: synthesesListSummary(filtered),
          attributes: listAttributes(),
        })}
        agentVariant={{ position: "last" }}
        aiVariants={[
          {
            id: "briefs",
            label: "Briefs",
            hint: "Every synthesis, result clipped to 800 chars",
            build: () => ({
              kind: "research-syntheses",
              location: researchLocation("Synthesis"),
              description:
                "Every synthesis on this topic, results clipped to 800 chars each.",
              data: {
                page_kpis: listKpis,
                syntheses: filtered.map((s) => synthesisBrief(s, 800)),
              },
              attributes: { ...listAttributes(), detail: "briefs" },
            }),
          },
          {
            id: "index",
            label: "Index only",
            hint: "Identity, status and sizes — no result text",
            build: () => ({
              kind: "research-syntheses",
              location: researchLocation("Synthesis"),
              description:
                "Index of the syntheses on this topic — no result bodies.",
              data: {
                page_kpis: listKpis,
                syntheses: filtered.map((s) => {
                  const { result, ...rest } = synthesisBrief(s, 0);
                  return rest;
                }),
              },
              attributes: { ...listAttributes(), detail: "index" },
            }),
          },
        ]}
        aiCustom={{
          label: "Open custom view…",
          hint: "Tune how much of each synthesis comes along",
          options: [
            {
              kind: "number",
              key: "resultChars",
              label: "Chars per synthesis",
              hint: "0 = unlimited. Each clipped result states how much it dropped.",
              min: 0,
              step: 100,
              presets: [
                { label: "400", value: 400 },
                { label: "800", value: 800 },
                { label: "2k", value: 2000 },
                { label: "8k", value: 8000 },
                { label: "All", value: 0 },
              ],
              default: 800,
            },
            {
              kind: "toggle",
              key: "failedOnly",
              label: "Failed only",
              hint: "Just the syntheses that errored.",
              default: false,
            },
            {
              kind: "toggle",
              key: "currentOnly",
              label: "Current versions only",
              default: false,
            },
          ],
          build: (opts) => {
            const rows = customRows(opts);
            return {
              text: JSON.stringify(rows, null, 2),
              meta: {
                rows: rows.length,
                chars_per_synthesis: Number(opts.resultChars ?? 800) || "all",
              },
            };
          },
          wrap: (_text, opts, meta) => ({
            kind: "research-syntheses",
            location: researchLocation("Synthesis"),
            description: "A custom slice of the syntheses on this page.",
            // Shortened variants are lossy in DATA only — the ambient context
            // (page KPIs, filters) is identical to every other variant.
            data: { page_kpis: listKpis, syntheses: customRows(opts) },
            attributes: {
              ...listAttributes(),
              detail: "custom",
              rows: Number(meta?.rows ?? 0),
              chars_per_synthesis: meta?.chars_per_synthesis,
            },
          }),
        }}
      />
      {runButton}
    </>
  );

  // ── The reader: one synthesis open at a time (URL ?record=<id>) ──────────
  const flagOf = (syn: ResearchSynthesis): string | undefined =>
    syn.status === "failed" ? "Failed" : !hasText(syn.result) ? (isTerminalStatus(syn.status) ? "Empty" : "Running") : undefined;
  const groups = [
    { title: "Topic report", items: topicSyntheses.map((s) => ({ synthesis: s, label: documentTitleOf(s.result, "Topic report") })) },
    { title: "Keyword syntheses", items: keywordSyntheses.map((s) => ({ synthesis: s, label: documentTitleOf(s.result, getKeywordLabel(s.keyword_id)) })) },
  ];
  const library = {
    groups: groups
      .filter((g) => g.items.length > 0)
      .map((g) => ({ label: g.title, items: g.items.map(({ synthesis, label }) => ({ id: synthesis.id, title: label, content: synthesis.result ?? "", flag: flagOf(synthesis) })) })),
    activeId: null as string | null,
    onSelect: (id: string) => selectSynthesis(id),
  };
  const ordered = groups.flatMap((g) => g.items);
  const requested = searchParams.get("record");
  const selected =
    ordered.find((item) => item.synthesis.id === requested) ??
    ordered.find((item) => item.synthesis.is_current && hasText(item.synthesis.result)) ??
    ordered[0] ??
    null;
  library.activeId = selected?.synthesis.id ?? null;
  const selectSynthesis = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("record", id);
    replaceAddressWithoutNavigating(`${pathname}?${next.toString()}`);
  };
  const readerRecord: ResearchReaderRecord | null =
    selected && hasText(selected.synthesis.result)
      ? {
          type: "research_synthesis",
          id: selected.synthesis.id,
          title: selected.label,
          version: selected.synthesis.capture_version ?? 1,
          kind: synthesisKind(selected.synthesis),
          body: selected.synthesis.result,
          href: `/research/topics/${topicId}/synthesis?record=${selected.synthesis.id}`,
          rowVersion: selected.synthesis.version ?? null,
          onEdited: refetchSyntheses,
        }
      : null;

  const topNotices = (
    <>
      {/* The topic report predates the newest keyword synthesis — it was
          written without that material. `/run` will NOT fix this on its own
          (aidream research/service.py:2014 refuses a second topic synthesis
          once one exists), so the choice has to be offered here explicitly.
          Both options preserve the current report as a previous version. */}
      {reportStale && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.05] p-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="min-w-0 flex-1 type-meta leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">Topic report out of date</span>{" "}
            · open comments go to the writer
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" title="Rewrite the report from every included source (a paid AI run); this one is kept as a version" onClick={() => void handleRunTopicSynthesis("rebuild")} disabled={stream.isStreaming}>
              Rebuild
            </Button>
            <Button variant="primary" icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : undefined} title="Fold the newest keyword synthesis into the report (a paid AI run); this one is kept as a version" onClick={() => void handleRunTopicSynthesis("update")} disabled={stream.isStreaming}>
              Update
            </Button>
          </div>
        </div>
      )}
      {/* Live streaming synthesis — shown while the writer works */}
      {stream.isStreaming && (streamingText || streamingLabel) && (
        <div className="mb-3 overflow-hidden rounded-xl border border-primary/30 bg-card/60">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            <span className="type-secondary font-medium text-primary">
              {streamingLabel ? `Synthesizing ${streamingLabel}…` : "Synthesizing…"}
            </span>
          </div>
          {streamingText && (
            <div className="px-3 py-3">
              <RichContent level="full" imagePolicy="ai" source={streamingText} isStreaming />
            </div>
          )}
        </div>
      )}
      {synthError && synthList.length > 0 && (
        <StaleDataNotice hasData what="this topic's syntheses" onRetry={refetchSyntheses} retrying={synthLoading} detail={synthError} />
      )}
    </>
  );

  const placeholder = synthLoading ? (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  ) : synthError && filtered.length === 0 ? (
    <ReadFailure error={synthError} what="this topic's syntheses" onRetry={refetchSyntheses} />
  ) : selected ? (
    <>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">{selected.label}</h1>
      <SynthesisWithoutText synthesis={selected.synthesis} label={selected.label} />
    </>
  ) : stream.isStreaming ? null : (
    <EmptyState
      icon={<Layers aria-hidden />}
      title="No syntheses yet"
      line="Turn your sources and analyses into one report."
      action={
        <Button variant="primary" icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <Layers aria-hidden />} onClick={() => void handleRunTopicSynthesis("initial")} disabled={stream.isStreaming}>
          Run synthesis
        </Button>
      }
    />
  );

  return (
    <ResearchRecordReader
      groupKey="research-synthesis-reader"
      defaultLayout={defaultLayout}
      record={readerRecord}
      panelLabel="Synthesis"
      // Actions on the whole set live with the set; tap buttons space themselves (no gap).
      panelActions={<div className="flex items-center">{copyControls}</div>}
      library={library}
      toolbar={selected ? <SynthesisCopy synthesis={selected.synthesis} label={selected.label} /> : undefined}
      header={
        <>
          {topNotices}
          {readerRecord && selected?.synthesis.status === "failed" && (
            <StoppedEarlyNote reason={selected.synthesis.error || "Synthesis stopped early."} />
          )}
        </>
      }
      details={selected ? <SynthesisDetails synthesis={selected.synthesis} /> : undefined}
      placeholder={placeholder}
      extraTabs={
        selected
          ? [
              {
                id: "versions",
                label: "Versions",
                content: (
                  // Superseded versions. A rebuild flips the old row's `is_current` and
                  // inserts a new version — nothing is destroyed.
                  <SynthesisVersionHistory
                    key={selected.synthesis.id}
                    topicId={selected.synthesis.topic_id}
                    scope={selected.synthesis.scope}
                    keywordId={selected.synthesis.keyword_id ?? undefined}
                    label={selected.synthesis.keyword_id ? "keyword synthesis" : "topic report"}
                    embedded
                  />
                ),
              },
            ]
          : []
      }
    />
  );
}
