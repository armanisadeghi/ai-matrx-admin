"use client";

import { readOf } from "@ai-matrx/design-system";
import { useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Layout } from "react-resizable-panels";
import { Badge as StatusBadge } from "@ai-matrx/design-system/controls";
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
import { ResearchFilterBar, type FilterDef } from "../shared/ResearchFilterBar";
import { StoppedEarlyNote } from "../shared/StoppedEarlyNote";
import { SynthesisVersionHistory } from "./SynthesisVersionHistory";
import { AiModelRef } from "@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef";
import { deriveReadiness } from "../../readiness";
import type { FilterOption } from "@/components/hierarchy-filter/HierarchyFilterPill";
import type { ResearchSynthesis, ResearchDataEvent } from "../../types";
import { idMatchesQuery } from "@ai-matrx/kit/search-scoring";
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
import { ExportMenu } from "@/components/agent-copy/ExportMenu";
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

const STATUS_TONE: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  complete: "success",
  success: "success",
  pending: "warning",
  error: "destructive",
  failed: "destructive",
};

/** The selected synthesis's own row: identity, status, version, model, its copy pair. */
function SynthesisHeader({ synthesis, label }: { synthesis: ResearchSynthesis; label: string }) {
  const { progress } = useTopicContext();
  const kpis = researchKpis(progress, null);
  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{label}</h1>
            <StatusBadge tone={STATUS_TONE[synthesis.status] ?? "neutral"}>{synthesis.status}</StatusBadge>
          </div>
          <p className="type-meta mt-0.5 text-muted-foreground">
            <span className="capitalize">{synthesisKind(synthesis)}</span>
            {" · "}
            {synthesis.created_at ? new Date(synthesis.created_at).toLocaleDateString() : "Unknown date"}
            {synthesis.capture_version != null ? ` · v${synthesis.capture_version}` : null}
            {synthesis.model_id ? (
              <span className="ml-1 inline-flex align-middle">
                ·
                <AiModelRef modelId={synthesis.model_id} showIcon={false} disableNavigation className="ml-1" />
              </span>
            ) : null}
          </p>
        </div>
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
      </div>
      {synthesis.status === "failed" && hasText(synthesis.result) && (
        <StoppedEarlyNote reason={synthesis.error || "Synthesis stopped early."} />
      )}
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

/** The left column's list of syntheses, grouped like the old page's sections. */
function SynthesisNavigator({
  groups,
  selectedId,
  onSelect,
}: {
  groups: { title: string; items: { synthesis: ResearchSynthesis; label: string }[] }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Syntheses" className="mb-2 grid gap-2">
      {groups.filter((g) => g.items.length > 0).map((group) => (
        <section key={group.title}>
          <p className="flex items-center gap-1.5 px-1.5 py-1 type-meta font-semibold uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3 w-3" aria-hidden />
            {group.title}
            <span className="font-normal">{group.items.length}</span>
          </p>
          <ul className="grid list-none gap-0.5 p-0">
            {group.items.map(({ synthesis, label }) => (
              <li key={synthesis.id}>
                <button
                  type="button"
                  onClick={() => onSelect(synthesis.id)}
                  aria-current={synthesis.id === selectedId ? "true" : undefined}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    synthesis.id === selectedId ? "bg-primary/10 text-primary-ink" : "hover:bg-accent",
                  )}
                >
                  <span className="block truncate font-medium">{label}</span>
                  <span className="block truncate type-meta text-muted-foreground">
                    {synthesis.status}
                    {synthesis.capture_version != null ? ` · v${synthesis.capture_version}` : ""}
                    {synthesis.created_at ? ` · ${new Date(synthesis.created_at).toLocaleDateString()}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export default function SynthesisList({ defaultLayout }: { defaultLayout?: Layout }) {
  const { topicId, progress, refreshProgress } = useTopicContext();
  const router = useRouter();
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

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);

  const synthList = (allSyntheses ?? []) as ResearchSynthesis[];
  const kwList = keywords ?? [];

  const getKeywordLabel = (kwId: string | null) => {
    if (!kwId) return "Unknown Keyword";
    const kw = kwList.find((k) => k.id === kwId);
    return kw ? kw.keyword : "Keyword";
  };

  const filtered = useMemo(() => {
    let items = synthList;
    // PHASE-4 COMPAT: legacy rs_synthesis rows still carry scope="project"
    // (meaning topic-wide) — match on the normalized vocabulary.
    if (scopeFilter)
      items = items.filter(
        (s) => normalizeSynthesisScope(s.scope) === scopeFilter,
      );
    if (statusFilter) items = items.filter((s) => s.status === statusFilter);
    if (keywordFilter)
      items = items.filter((s) => s.keyword_id === keywordFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          (s.result ?? "").toLowerCase().includes(q) ||
          (s.error ?? "").toLowerCase().includes(q) ||
          getKeywordLabel(s.keyword_id).toLowerCase().includes(q) ||
          (s.model_id ?? "").toLowerCase().includes(q) ||
          s.scope.toLowerCase().includes(q) ||
          idMatchesQuery(s, q),
      );
    }
    return items;
  }, [synthList, scopeFilter, statusFilter, keywordFilter, search, kwList]);

  // Topic-wide syntheses: normalized so legacy scope="project" rows are
  // included (PHASE-4 COMPAT).
  const topicSyntheses = filtered.filter(
    (s) => normalizeSynthesisScope(s.scope) === "topic",
  );
  const keywordSyntheses = filtered.filter((s) => s.scope === "keyword");

  const scopeOptions: FilterOption[] = [
    { id: "topic", label: "Topic" },
    { id: "keyword", label: "Keyword" },
  ];
  const statusOptions: FilterOption[] = [
    { id: "success", label: "Success" },
    { id: "failed", label: "Failed" },
  ];
  const kwOptions: FilterOption[] = useMemo(
    () => kwList.map((kw) => ({ id: kw.id, label: kw.keyword })),
    [kwList],
  );

  const filterDefs: FilterDef[] = useMemo(() => {
    const defs: FilterDef[] = [
      {
        key: "scope",
        label: "Scope",
        allLabel: "All Scopes",
        options: scopeOptions,
        selectedId: scopeFilter,
        onSelect: setScopeFilter,
      },
      {
        key: "status",
        label: "Status",
        allLabel: "All",
        options: statusOptions,
        selectedId: statusFilter,
        onSelect: setStatusFilter,
      },
    ];
    if (kwList.length > 0) {
      defs.push({
        key: "keyword",
        label: "Keyword",
        allLabel: "All Keywords",
        options: kwOptions,
        selectedId: keywordFilter,
        onSelect: setKeywordFilter,
      });
    }
    return defs;
  }, [
    scopeOptions,
    statusOptions,
    kwOptions,
    scopeFilter,
    statusFilter,
    keywordFilter,
    kwList.length,
  ]);

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
    <button
      onClick={() => void handleRunTopicSynthesis("initial")}
      disabled={stream.isStreaming}
      className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full matrx-glass-card text-[11px] font-medium text-primary disabled:opacity-50 transition-colors shrink-0"
    >
      {stream.isStreaming ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">Run</span>
    </button>
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
    scope_filter: scopeFilter ?? "all",
    status_filter: statusFilter ?? "all",
    keyword_filter: keywordFilter ?? "all",
    search: search || undefined,
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
        human={() => synthesesListSummary(filtered)}
        agent={() => ({
          kind: "research-syntheses",
          location: researchLocation("Synthesis"),
          description:
            "Every synthesis matching the current filters, with full result text.",
          data: {
            filters: {
              scope: scopeFilter ?? "all",
              status: statusFilter ?? "all",
              keyword: keywordFilter ?? "all",
              search: search || null,
            },
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
                "Every synthesis matching the current filters, results clipped to 800 chars each.",
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
                "Index of the syntheses matching the current filters — no result bodies.",
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
      <ExportMenu
        label="Syntheses"
        items={[
          // Export covers ALL rows in scope, with full result text.
          jsonExportItem(() => ({
            page_kpis: listKpis,
            syntheses: filtered,
          })),
          csvExportItem(
            () => filtered.map((s) => synthesisBrief(s, 0)),
            "CSV (all matching)",
            SYNTHESIS_CSV_COLUMNS,
          ),
        ]}
      />
      {runButton}
    </>
  );

  // ── The reader: one synthesis open at a time (URL ?record=<id>) ──────────
  const groups = [
    { title: "Topic Report", items: topicSyntheses.map((s) => ({ synthesis: s, label: "Topic Report" })) },
    { title: "Keyword Syntheses", items: keywordSyntheses.map((s) => ({ synthesis: s, label: getKeywordLabel(s.keyword_id) })) },
  ];
  const ordered = groups.flatMap((g) => g.items);
  const requested = searchParams.get("record");
  const selected =
    ordered.find((item) => item.synthesis.id === requested) ??
    ordered.find((item) => item.synthesis.is_current && hasText(item.synthesis.result)) ??
    ordered[0] ??
    null;
  const selectSynthesis = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("record", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
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
            <button
              type="button"
              onClick={() => void handleRunTopicSynthesis("rebuild")}
              disabled={stream.isStreaming}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full matrx-glass-card text-[11px] font-medium text-foreground/80 hover:text-foreground disabled:opacity-40 transition-colors"
            >
              Rebuild
            </button>
            <button
              type="button"
              onClick={() => void handleRunTopicSynthesis("update")}
              disabled={stream.isStreaming}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 disabled:opacity-40 transition-all"
            >
              {stream.isStreaming && <Loader2 className="h-3 w-3 animate-spin" />}
              Update
            </button>
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
      <SynthesisHeader synthesis={selected.synthesis} label={selected.label} />
      <SynthesisWithoutText synthesis={selected.synthesis} label={selected.label} />
    </>
  ) : stream.isStreaming ? null : (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
        <Layers className="h-6 w-6 text-primary/40" />
      </div>
      <div>
        <p className="type-secondary font-medium text-foreground/70">{synthList.length === 0 ? "No syntheses yet" : "No matches"}</p>
        <p className="type-meta mt-1 max-w-[240px] text-muted-foreground">
          {synthList.length === 0 ? "Turn your sources and analyses into one report." : "Try other filters or search."}
        </p>
      </div>
      {synthList.length === 0 && (
        <button
          onClick={() => void handleRunTopicSynthesis("initial")}
          disabled={stream.isStreaming}
          className="inline-flex min-h-[44px] items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
        >
          {stream.isStreaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
          Run Synthesis
        </button>
      )}
    </div>
  );

  return (
    <ResearchRecordReader
      groupKey="research-synthesis-reader"
      defaultLayout={defaultLayout}
      record={readerRecord}
      // List-level actions sit over the reader; tap buttons space themselves (no gap).
      toolbar={<div className="flex items-center justify-end">{copyControls}</div>}
      navigator={
        <>
          {/* The filters narrow the list below them. */}
          <ResearchFilterBar
            className="mb-2"
            title="Synthesis"
            count={`${filtered.length}/${synthList.length}`}
            read={readOf({ isLoading: synthLoading, error: synthError })}
            filters={filterDefs}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search syntheses"
          />
          <SynthesisNavigator groups={groups} selectedId={selected?.synthesis.id ?? null} onSelect={selectSynthesis} />
        </>
      }
      header={
        <>
          {topNotices}
          {readerRecord && selected && <SynthesisHeader synthesis={selected.synthesis} label={selected.label} />}
        </>
      }
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
                  />
                ),
              },
            ]
          : []
      }
    />
  );
}
