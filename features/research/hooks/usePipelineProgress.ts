"use client";

import { useCallback, useMemo, useReducer, useRef } from "react";
import type {
  ResearchDataEvent,
  ResearchInfoEvent,
  ResearchStreamStep,
  ResearchTopic,
} from "../types";

// ============================================================================
// Types
// ============================================================================

export type StageKind =
  | "search"
  | "scrape"
  | "analyze"
  | "synthesize"
  | "report";

export type ItemStatus =
  | "pending"
  | "active"
  | "success"
  | "partial"
  | "failed"
  | "manual"
  | "skipped"
  | "complete"
  | "dead_link"
  | "gated";

export type IterationMode = "initial" | "rebuild" | "update";

export interface WorkItemMetadata {
  keyword?: string;
  keyword_id?: string;
  model_id?: string | null;
  agent_type?: string;
  char_count?: number;
  result_length?: number;
  is_good_scrape?: boolean;
  page_count?: number;
  pages_completed?: number;
  total_pages?: number;
  sources_found?: number;
  stored_count?: number;
  capture_level?: 1 | 2 | 3 | 4;
  server_attempts?: number;
  last_failure_reason?: string;
  error?: string;
  delta?: "new" | "changed" | "stale";
  scope?: "keyword" | "project" | "tag";
  version?: number;
}

export interface WorkItem {
  id: string;
  label: string;
  url?: string;
  hostname?: string;
  status: ItemStatus;
  progress?: { current: number; total: number; unit: "pages" | "sources" };
  metadata: WorkItemMetadata;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface StageState {
  kind: StageKind;
  status: "pending" | "active" | "complete" | "partial" | "failed";
  items: Record<string, WorkItem>;
  itemOrder: string[];
  totals: {
    started: number;
    succeeded: number;
    failed: number;
    target?: number;
  };
  /** Last 30s of completion timestamps for sparkline / rate */
  recentCompletions: number[];
  startedAt: number | null;
  completedAt: number | null;
  /** Latest free-text status from an info event — shown in the stage header */
  infoMessage?: string;
  /** Timestamp of the most recent info message */
  lastInfoAt?: number;
  /** Aggregate counts parsed from scrape_progress / analysis_progress messages */
  scrapeAggregate?: {
    scraped: number;
    good: number;
  };
  analyzeAggregate?: {
    queued?: number;
    alreadyDone?: number;
    inFlight?: number;
  };
}

export interface InfoMessage {
  id: string;
  timestamp: number;
  code: string;
  message: string;
  level: "info" | "warning" | "error";
}

export interface PipelineState {
  stages: Record<StageKind, StageState>;
  activeStage: StageKind | null;
  startedAt: number | null;
  completedAt: number | null;
  infos: InfoMessage[];
  iterationMode: IterationMode | null;
}

// ============================================================================
// Initial state
// ============================================================================

function emptyStage(kind: StageKind): StageState {
  return {
    kind,
    status: "pending",
    items: {},
    itemOrder: [],
    totals: { started: 0, succeeded: 0, failed: 0 },
    recentCompletions: [],
    startedAt: null,
    completedAt: null,
  };
}

function emptyState(iterationMode: IterationMode | null = null): PipelineState {
  return {
    stages: {
      search: emptyStage("search"),
      scrape: emptyStage("scrape"),
      analyze: emptyStage("analyze"),
      synthesize: emptyStage("synthesize"),
      report: emptyStage("report"),
    },
    activeStage: null,
    startedAt: null,
    completedAt: null,
    infos: [],
    iterationMode,
  };
}

// ============================================================================
// Actions + reducer
// ============================================================================

type Action =
  | { type: "data"; payload: ResearchDataEvent; timestamp: number }
  | { type: "info"; payload: InfoMessage }
  | { type: "phase"; payload: ResearchStreamStep; timestamp: number }
  | { type: "reset"; iterationMode: IterationMode | null };

const PHASE_TO_STAGE: Record<string, StageKind> = {
  searching: "search",
  scraping: "scrape",
  analyzing: "analyze",
  retrying: "analyze",
  synthesizing: "synthesize",
  reporting: "report",
};

function hostnameOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function pruneRecent(timestamps: number[], now: number): number[] {
  const cutoff = now - 30_000;
  return timestamps.filter((t) => t >= cutoff);
}

function activateStage(state: PipelineState, kind: StageKind, ts: number): PipelineState {
  const stage = state.stages[kind];
  return {
    ...state,
    activeStage: kind,
    startedAt: state.startedAt ?? ts,
    stages: {
      ...state.stages,
      [kind]: {
        ...stage,
        status: stage.status === "pending" ? "active" : stage.status,
        startedAt: stage.startedAt ?? ts,
      },
    },
  };
}

function upsertItem(
  state: PipelineState,
  kind: StageKind,
  id: string,
  patch: (existing: WorkItem | undefined) => WorkItem,
): PipelineState {
  const stage = state.stages[kind];
  const existing = stage.items[id];
  const next = patch(existing);
  const itemOrder = existing ? stage.itemOrder : [...stage.itemOrder, id];
  return {
    ...state,
    stages: {
      ...state.stages,
      [kind]: {
        ...stage,
        items: { ...stage.items, [id]: next },
        itemOrder,
      },
    },
  };
}

function bumpCompletion(
  state: PipelineState,
  kind: StageKind,
  ts: number,
  outcome: "succeeded" | "failed",
): PipelineState {
  const stage = state.stages[kind];
  return {
    ...state,
    stages: {
      ...state.stages,
      [kind]: {
        ...stage,
        totals: {
          ...stage.totals,
          [outcome]: stage.totals[outcome] + 1,
        },
        recentCompletions: [...pruneRecent(stage.recentCompletions, ts), ts],
      },
    },
  };
}

function reduceData(
  state: PipelineState,
  e: ResearchDataEvent,
  ts: number,
): PipelineState {
  switch (e.type) {
    case "search_page_start": {
      const next = activateStage(state, "search", ts);
      return upsertItem(next, "search", e.keyword_id, (existing) => {
        const totalPages = e.total_pages;
        const currentPage = Math.max(existing?.progress?.current ?? 0, e.page);
        return {
          id: e.keyword_id,
          label: existing?.label ?? e.keyword,
          status: "active",
          progress: { current: currentPage, total: totalPages, unit: "pages" },
          metadata: {
            ...(existing?.metadata ?? {}),
            keyword: e.keyword,
            keyword_id: e.keyword_id,
            total_pages: totalPages,
          },
          startedAt: existing?.startedAt ?? ts,
          updatedAt: ts,
          completedAt: null,
        };
      });
    }

    case "search_page_complete": {
      return upsertItem(state, "search", e.keyword_id, (existing) => {
        const pagesCompleted = (existing?.metadata.pages_completed ?? 0) + 1;
        const sourcesFound = Math.max(
          existing?.metadata.sources_found ?? 0,
          e.total_so_far,
        );
        return {
          id: e.keyword_id,
          label: existing?.label ?? e.keyword,
          status: existing?.status === "success" ? "success" : "active",
          progress: {
            current: existing?.progress?.current ?? e.page,
            total: existing?.progress?.total ?? e.page,
            unit: "pages",
          },
          metadata: {
            ...(existing?.metadata ?? {}),
            keyword: e.keyword,
            keyword_id: e.keyword_id,
            pages_completed: pagesCompleted,
            sources_found: sourcesFound,
          },
          startedAt: existing?.startedAt ?? ts,
          updatedAt: ts,
          completedAt: existing?.completedAt ?? null,
        };
      });
    }

    case "search_sources_stored": {
      const next = upsertItem(state, "search", e.keyword_id, (existing) => ({
        id: e.keyword_id,
        label: existing?.label ?? "Keyword",
        status: "success",
        progress: existing?.progress,
        metadata: {
          ...(existing?.metadata ?? {}),
          stored_count: e.stored_count,
          sources_found: Math.max(
            existing?.metadata.sources_found ?? 0,
            e.stored_count,
          ),
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(next, "search", ts, "succeeded");
    }

    case "search_complete": {
      const stage = state.stages.search;
      return {
        ...state,
        stages: {
          ...state.stages,
          search: {
            ...stage,
            status: "complete",
            completedAt: ts,
            totals: { ...stage.totals, target: e.total_sources },
          },
        },
      };
    }

    case "scrape_start": {
      const next = activateStage(state, "scrape", ts);
      return upsertItem(next, "scrape", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? hostnameOf(e.url) ?? "Source",
        url: e.url,
        hostname: hostnameOf(e.url),
        status: "active",
        metadata: { ...(existing?.metadata ?? {}) },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: null,
      }));
    }

    case "scrape_complete": {
      const status: ItemStatus = e.is_good_scrape
        ? "success"
        : e.status === "thin"
          ? "partial"
          : "failed";
      const next = upsertItem(state, "scrape", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? hostnameOf(e.url) ?? "Source",
        url: existing?.url ?? e.url,
        hostname: existing?.hostname ?? hostnameOf(e.url),
        status,
        metadata: {
          ...(existing?.metadata ?? {}),
          char_count: e.char_count,
          is_good_scrape: e.is_good_scrape,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(
        next,
        "scrape",
        ts,
        e.is_good_scrape ? "succeeded" : "failed",
      );
    }

    case "scrape_failed": {
      const next = upsertItem(state, "scrape", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? hostnameOf(e.url) ?? "Source",
        url: existing?.url ?? e.url,
        hostname: existing?.hostname ?? hostnameOf(e.url),
        status: "failed",
        metadata: {
          ...(existing?.metadata ?? {}),
          error: e.reason,
          last_failure_reason: e.reason,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(next, "scrape", ts, "failed");
    }

    case "rescrape_complete": {
      return upsertItem(state, "scrape", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? "Source",
        url: existing?.url,
        hostname: existing?.hostname,
        status: e.is_good_scrape ? "success" : "partial",
        metadata: {
          ...(existing?.metadata ?? {}),
          char_count: e.char_count,
          is_good_scrape: e.is_good_scrape,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
    }

    case "analysis_start": {
      const next = activateStage(state, "analyze", ts);
      const stage = next.stages.analyze;
      const stageWithTarget: PipelineState = stage.totals.target
        ? next
        : {
            ...next,
            stages: {
              ...next.stages,
              analyze: {
                ...stage,
                totals: { ...stage.totals, target: e.total },
              },
            },
          };
      return upsertItem(stageWithTarget, "analyze", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? "Source",
        url: existing?.url,
        hostname: existing?.hostname,
        status: "active",
        metadata: { ...(existing?.metadata ?? {}) },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: null,
      }));
    }

    case "analysis_complete": {
      const next = upsertItem(state, "analyze", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? "Source",
        url: existing?.url,
        hostname: existing?.hostname,
        status: "success",
        metadata: {
          ...(existing?.metadata ?? {}),
          agent_type: e.agent_type,
          model_id: e.model_id,
          result_length: e.result_length,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(next, "analyze", ts, "succeeded");
    }

    case "analysis_failed": {
      const next = upsertItem(state, "analyze", e.source_id, (existing) => ({
        id: e.source_id,
        label: existing?.label ?? "Source",
        url: existing?.url,
        hostname: existing?.hostname,
        status: "failed",
        metadata: { ...(existing?.metadata ?? {}), error: e.error },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(next, "analyze", ts, "failed");
    }

    case "analyze_all_complete": {
      const stage = state.stages.analyze;
      return {
        ...state,
        stages: {
          ...state.stages,
          analyze: {
            ...stage,
            status: "complete",
            completedAt: ts,
            totals: {
              ...stage.totals,
              target: stage.totals.target ?? e.count,
            },
          },
        },
      };
    }

    case "retry_complete": {
      return upsertItem(state, "analyze", e.analysis_id, (existing) => ({
        id: e.analysis_id,
        label: existing?.label ?? "Retry",
        status: "success",
        metadata: { ...(existing?.metadata ?? {}) },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
    }

    case "retry_all_complete": {
      // Aggregate-only — no per-item update needed.
      return state;
    }

    case "synthesis_start": {
      const next = activateStage(state, "synthesize", ts);
      const id = `${e.scope}:${e.keyword_id ?? "project"}`;
      return upsertItem(next, "synthesize", id, (existing) => ({
        id,
        label:
          existing?.label ??
          (e.scope === "project"
            ? "Project synthesis"
            : (e.keyword ?? "Keyword synthesis")),
        status: "active",
        metadata: {
          ...(existing?.metadata ?? {}),
          scope: e.scope,
          keyword: e.keyword ?? undefined,
          keyword_id: e.keyword_id ?? undefined,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: null,
      }));
    }

    case "synthesis_complete": {
      const id = `${e.scope}:${e.keyword_id ?? "project"}`;
      const next = upsertItem(state, "synthesize", id, (existing) => ({
        id,
        label:
          existing?.label ??
          (e.scope === "project"
            ? "Project synthesis"
            : (e.keyword ?? "Keyword synthesis")),
        status: "success",
        metadata: {
          ...(existing?.metadata ?? {}),
          scope: e.scope,
          model_id: e.model_id,
          result_length: e.result_length,
          version: e.version,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(next, "synthesize", ts, "succeeded");
    }

    case "synthesis_failed": {
      const id = `${e.scope}:${e.keyword_id ?? "project"}`;
      const next = upsertItem(state, "synthesize", id, (existing) => ({
        id,
        label: existing?.label ?? "Synthesis",
        status: "failed",
        metadata: {
          ...(existing?.metadata ?? {}),
          scope: e.scope,
          error: e.error,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return bumpCompletion(next, "synthesize", ts, "failed");
    }

    case "consolidate_complete": {
      const next = activateStage(state, "report", ts);
      return upsertItem(next, "report", `tag:${e.tag_id}`, (existing) => ({
        id: `tag:${e.tag_id}`,
        label: existing?.label ?? "Tag consolidation",
        status: "success",
        metadata: { ...(existing?.metadata ?? {}) },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
    }

    case "suggest_tags_complete": {
      const next = activateStage(state, "report", ts);
      return upsertItem(next, "report", `tags:${e.source_id}`, (existing) => ({
        id: `tags:${e.source_id}`,
        label: existing?.label ?? "Auto-tag",
        status: "success",
        metadata: { ...(existing?.metadata ?? {}) },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
    }

    case "document_complete": {
      const next = activateStage(state, "report", ts);
      const stage = next.stages.report;
      const withDoc = upsertItem(next, "report", "document", (existing) => ({
        id: "document",
        label: existing?.label ?? "Document",
        status: "success",
        metadata: { ...(existing?.metadata ?? {}) },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      return {
        ...withDoc,
        stages: {
          ...withDoc.stages,
          report: { ...withDoc.stages.report, status: "complete", completedAt: ts },
        },
      };
    }

    case "pipeline_complete": {
      return { ...state, completedAt: ts };
    }

    case "suggest_complete": {
      // Used by the init wizard, not the live pipeline. Pass-through.
      return state;
    }

    default: {
      // Type-safety guard — every new event type added to ResearchDataEvent
      // must be handled here. TypeScript will surface the gap.
      return state;
    }
  }
}

// ============================================================================
// Info event → stage state mapping
// ============================================================================

const SEARCH_CODES = new Set([
  "search_start",
  "search_progress",
  "search_results_found",
  "search_complete",
]);
const SCRAPE_CODES = new Set([
  "scrape_start",
  "scrape_progress",
  "scrape_complete",
  "scrape_failed",
]);
const ANALYSIS_CODES = new Set([
  "analysis_start",
  "analysis_progress",
  "analysis_complete",
  "analyze_all_complete",
]);
const SYNTHESIS_CODES = new Set([
  "synthesis_start",
  "synthesis_progress",
  "synthesis_complete",
  "keyword_synthesis_start",
  "keyword_synthesis_complete",
  "project_synthesis_start",
  "project_synthesis_complete",
]);
const REPORT_CODES = new Set([
  "document_start",
  "document_complete",
  "consolidate_start",
  "consolidate_complete",
  "tag_consolidation_complete",
  "pipeline_complete",
]);

function stageFromCode(code: string): StageKind | null {
  if (SEARCH_CODES.has(code)) return "search";
  if (SCRAPE_CODES.has(code)) return "scrape";
  if (ANALYSIS_CODES.has(code)) return "analyze";
  if (SYNTHESIS_CODES.has(code)) return "synthesize";
  if (REPORT_CODES.has(code)) return "report";
  return null;
}

function parseResultsFound(message: string): { count: number; keyword: string } | null {
  const m = message.match(/Found\s+(\d+)\s+results?\s+for\s+["']?([^"']+?)["']?$/i);
  if (!m) return null;
  return { count: Number(m[1]), keyword: m[2].trim() };
}

function parseScrapeProgress(message: string): { scraped: number; good: number } | null {
  const m = message.match(/Scraped\s+(\d+)\s+pages?,?\s*(\d+)\s+good/i);
  if (!m) return null;
  return { scraped: Number(m[1]), good: Number(m[2]) };
}

function parseAnalysisProgress(message: string): { queued: number; done: number } | null {
  const m = message.match(/Analy[sz]ing\s+(\d+)\s+page\(?s?\)?\s*\(?(\d+)\s+already\s+done/i);
  if (!m) return null;
  return { queued: Number(m[1]), done: Number(m[2]) };
}

function parseKeywordPassComplete(message: string): string | null {
  const m = message.match(/Keyword\s+["']([^"']+)["']:\s*pass\s+complete/i);
  return m ? m[1].trim() : null;
}

function parseKeywordCount(message: string): number | null {
  const m = message.match(/(\d+)\s+keyword/i);
  return m ? Number(m[1]) : null;
}

function reduceInfo(state: PipelineState, info: InfoMessage): PipelineState {
  const code = info.code;
  const message = info.message;
  const ts = info.timestamp;
  const stageKind = stageFromCode(code);

  let next = state;

  if (stageKind) {
    next = activateStage(next, stageKind, ts);
    const stage = next.stages[stageKind];
    next = {
      ...next,
      stages: {
        ...next.stages,
        [stageKind]: {
          ...stage,
          infoMessage: message,
          lastInfoAt: ts,
        },
      },
    };
  }

  if (code === "search_results_found") {
    const parsed = parseResultsFound(message);
    if (parsed) {
      const id = `kw:${parsed.keyword}`;
      next = upsertItem(next, "search", id, (existing) => ({
        id,
        label: existing?.label ?? parsed.keyword,
        status: "success",
        progress: existing?.progress,
        metadata: {
          ...(existing?.metadata ?? {}),
          keyword: parsed.keyword,
          sources_found: Math.max(
            existing?.metadata.sources_found ?? 0,
            parsed.count,
          ),
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      next = bumpCompletion(next, "search", ts, "succeeded");
    }
  }

  if (code === "search_start") {
    const total = parseKeywordCount(message);
    if (total != null) {
      const stage = next.stages.search;
      next = {
        ...next,
        stages: {
          ...next.stages,
          search: { ...stage, totals: { ...stage.totals, target: total } },
        },
      };
    }
  }

  if (code === "scrape_progress") {
    const kw = parseKeywordPassComplete(message);
    if (kw) {
      const id = `scrape-kw:${kw}`;
      next = upsertItem(next, "scrape", id, (existing) => ({
        id,
        label: existing?.label ?? `${kw} pass`,
        status: "success",
        metadata: {
          ...(existing?.metadata ?? {}),
          keyword: kw,
        },
        startedAt: existing?.startedAt ?? ts,
        updatedAt: ts,
        completedAt: ts,
      }));
      next = bumpCompletion(next, "scrape", ts, "succeeded");
    }
    const counts = parseScrapeProgress(message);
    if (counts) {
      const stage = next.stages.scrape;
      next = {
        ...next,
        stages: {
          ...next.stages,
          scrape: {
            ...stage,
            scrapeAggregate: {
              scraped: Math.max(
                stage.scrapeAggregate?.scraped ?? 0,
                counts.scraped,
              ),
              good: Math.max(stage.scrapeAggregate?.good ?? 0, counts.good),
            },
            totals: {
              ...stage.totals,
              succeeded: Math.max(stage.totals.succeeded, counts.good),
              target: Math.max(stage.totals.target ?? 0, counts.scraped),
            },
          },
        },
      };
    }
  }

  if (code === "analysis_progress" || code === "analysis_start") {
    const parsed = parseAnalysisProgress(message);
    if (parsed) {
      const stage = next.stages.analyze;
      next = {
        ...next,
        stages: {
          ...next.stages,
          analyze: {
            ...stage,
            analyzeAggregate: {
              queued: parsed.queued,
              alreadyDone: parsed.done,
              inFlight: stage.analyzeAggregate?.inFlight ?? 0,
            },
            totals: {
              ...stage.totals,
              target: parsed.queued + parsed.done,
            },
          },
        },
      };
    }
  }

  if (code === "search_complete") {
    const stage = next.stages.search;
    next = {
      ...next,
      stages: {
        ...next.stages,
        search: { ...stage, status: "complete", completedAt: ts },
      },
    };
  }

  if (code === "analyze_all_complete") {
    const stage = next.stages.analyze;
    next = {
      ...next,
      stages: {
        ...next.stages,
        analyze: { ...stage, status: "complete", completedAt: ts },
      },
    };
  }

  if (code === "document_complete" || code === "pipeline_complete") {
    const stage = next.stages.report;
    next = {
      ...next,
      stages: {
        ...next.stages,
        report: { ...stage, status: "complete", completedAt: ts },
      },
      completedAt: code === "pipeline_complete" ? ts : next.completedAt,
    };
  }

  return next;
}

function reducer(state: PipelineState, action: Action): PipelineState {
  switch (action.type) {
    case "data":
      return reduceData(state, action.payload, action.timestamp);
    case "info": {
      const withInfo: PipelineState = {
        ...state,
        infos: [...state.infos, action.payload].slice(-500),
      };
      return reduceInfo(withInfo, action.payload);
    }
    case "phase": {
      const stage = PHASE_TO_STAGE[action.payload];
      if (!stage) return state;
      return activateStage(state, stage, action.timestamp);
    }
    case "reset":
      return emptyState(action.iterationMode);
    default:
      return state;
  }
}

// ============================================================================
// Cost estimation (coarse, in-flight)
// ============================================================================

/**
 * Per-1k-token rough cost estimates by model family. Used only for the
 * in-flight running-cost number; the authoritative cost arrives from the
 * backend's cost_summary after pipeline_complete and replaces this value.
 */
const MODEL_COST_PER_1K = {
  claude_input: 0.003,
  claude_output: 0.015,
  gpt_input: 0.0025,
  gpt_output: 0.01,
  gemini_input: 0.00125,
  gemini_output: 0.005,
  default_input: 0.002,
  default_output: 0.008,
};

function estimateAnalysisCost(modelId: string | null | undefined, resultLength: number): number {
  if (!modelId) {
    // Generic fallback: assume ~3000 input tokens, derive output from chars.
    const outTokens = Math.max(1, Math.round(resultLength / 4));
    return (3000 / 1000) * MODEL_COST_PER_1K.default_input +
      (outTokens / 1000) * MODEL_COST_PER_1K.default_output;
  }
  const m = modelId.toLowerCase();
  let inputRate = MODEL_COST_PER_1K.default_input;
  let outputRate = MODEL_COST_PER_1K.default_output;
  if (m.includes("claude")) {
    inputRate = MODEL_COST_PER_1K.claude_input;
    outputRate = MODEL_COST_PER_1K.claude_output;
  } else if (m.includes("gpt")) {
    inputRate = MODEL_COST_PER_1K.gpt_input;
    outputRate = MODEL_COST_PER_1K.gpt_output;
  } else if (m.includes("gemini")) {
    inputRate = MODEL_COST_PER_1K.gemini_input;
    outputRate = MODEL_COST_PER_1K.gemini_output;
  }
  // Assume avg 4000 input tokens per analysis (page summary), output from chars.
  const outTokens = Math.max(1, Math.round(resultLength / 4));
  return 4 * inputRate + (outTokens / 1000) * outputRate;
}

// ============================================================================
// Hook
// ============================================================================

export interface PipelineDerived {
  activeStage: StageKind | null;
  /** 0–1 across all stages. Heuristic: average of stage progress. */
  aggregateProgress: number;
  etaSeconds: number | null;
  /** sources/sec rate from the active stage */
  rate: number;
  totalSourcesDiscovered: number;
  totalCharsScraped: number;
  totalAnalysesCompleted: number;
  uniqueModels: string[];
  uniqueAgents: string[];
  /** "5 analyses serving 7 keywords (35 → 5 deduped)" or null when not applicable */
  dedupLabel: string | null;
  /**
   * Coarse running-cost estimate during the run.
   * After `pipeline_complete`, the consumer should refetch the topic
   * and replace this with the authoritative `cost_summary.total_estimated_cost_usd`.
   */
  runningCostUsd: number;
}

export interface UsePipelineProgressResult {
  state: PipelineState;
  derived: PipelineDerived;
  dispatch: (event: ResearchDataEvent) => void;
  dispatchInfo: (info: ResearchInfoEvent) => void;
  dispatchPhase: (step: ResearchStreamStep) => void;
  reset: (opts?: { iterationMode?: IterationMode | null }) => void;
}

/**
 * Reducer-driven hook that consumes every research stream event and produces
 * a normalized pipeline state for the live activity dashboard.
 *
 * Wire alongside the existing `useResearchStream`:
 * - In `onData`: call `dispatch(payload)`.
 * - In `onInfo`: call `dispatchInfo(info)`.
 * - In `onPhase`: call `dispatchPhase(step)`.
 * - On stream start: call `reset({ iterationMode })`.
 */
export function usePipelineProgress(opts?: {
  topic?: ResearchTopic | null;
}): UsePipelineProgressResult {
  const [state, rawDispatch] = useReducer(reducer, undefined, () => emptyState());
  const idCounter = useRef(0);

  const dispatch = useCallback((event: ResearchDataEvent) => {
    rawDispatch({ type: "data", payload: event, timestamp: Date.now() });
  }, []);

  const dispatchInfo = useCallback((info: ResearchInfoEvent) => {
    const level: InfoMessage["level"] =
      info.code.startsWith("quota_") || info.code.includes("warning")
        ? "warning"
        : info.code.includes("error")
          ? "error"
          : "info";
    rawDispatch({
      type: "info",
      payload: {
        id: `info-${++idCounter.current}`,
        timestamp: Date.now(),
        code: info.code,
        message: info.message,
        level,
      },
    });
  }, []);

  const dispatchPhase = useCallback((step: ResearchStreamStep) => {
    rawDispatch({ type: "phase", payload: step, timestamp: Date.now() });
  }, []);

  const reset = useCallback(
    (resetOpts?: { iterationMode?: IterationMode | null }) => {
      rawDispatch({
        type: "reset",
        iterationMode: resetOpts?.iterationMode ?? null,
      });
    },
    [],
  );

  const topic = opts?.topic;

  const derived = useMemo<PipelineDerived>(() => {
    const stages = state.stages;

    // Aggregate counts
    const totalSourcesDiscovered = Object.values(stages.search.items).reduce(
      (sum, item) => sum + (item.metadata.sources_found ?? 0),
      0,
    );
    const totalCharsScraped = Object.values(stages.scrape.items).reduce(
      (sum, item) => sum + (item.metadata.char_count ?? 0),
      0,
    );
    const totalAnalysesCompleted = stages.analyze.totals.succeeded;

    // Unique models / agents
    const uniqueModelsSet = new Set<string>();
    const uniqueAgentsSet = new Set<string>();
    for (const item of Object.values(stages.analyze.items)) {
      if (item.metadata.model_id) uniqueModelsSet.add(item.metadata.model_id);
      if (item.metadata.agent_type) uniqueAgentsSet.add(item.metadata.agent_type);
    }
    for (const item of Object.values(stages.synthesize.items)) {
      if (item.metadata.model_id) uniqueModelsSet.add(item.metadata.model_id);
    }

    // Dedup label — analyses ÷ (keyword_count × analyses_per_keyword)
    let dedupLabel: string | null = null;
    const keywordCount = stages.search.itemOrder.length;
    const analysesPerKeyword = topic?.analyses_per_keyword;
    if (
      keywordCount >= 2 &&
      analysesPerKeyword &&
      totalAnalysesCompleted > 0
    ) {
      const naive = keywordCount * analysesPerKeyword;
      if (naive > totalAnalysesCompleted) {
        dedupLabel = `${totalAnalysesCompleted} analyses serving ${keywordCount} keywords (${naive} → ${totalAnalysesCompleted} deduped)`;
      }
    }

    // Running cost — coarse estimate from analyze stage.
    let runningCostUsd = 0;
    for (const item of Object.values(stages.analyze.items)) {
      if (item.status === "success" && item.metadata.result_length) {
        runningCostUsd += estimateAnalysisCost(
          item.metadata.model_id,
          item.metadata.result_length,
        );
      }
    }
    for (const item of Object.values(stages.synthesize.items)) {
      if (item.status === "success" && item.metadata.result_length) {
        // Synthesis prompts are larger — rough 8k input tokens.
        const out = Math.max(1, Math.round(item.metadata.result_length / 4));
        runningCostUsd += 8 * MODEL_COST_PER_1K.default_input +
          (out / 1000) * MODEL_COST_PER_1K.default_output;
      }
    }

    // Rate from active stage
    const active = state.activeStage ? stages[state.activeStage] : null;
    const now = Date.now();
    const recent = active ? pruneRecent(active.recentCompletions, now) : [];
    const rate = recent.length > 1 ? recent.length / 30 : 0;

    // ETA — only when we have a target and a meaningful rate.
    let etaSeconds: number | null = null;
    if (active && active.totals.target && rate > 0) {
      const remaining = active.totals.target - active.totals.succeeded;
      if (remaining > 0) etaSeconds = Math.round(remaining / rate);
    }

    // Aggregate progress: average of completed-or-active stages
    const stageOrder: StageKind[] = [
      "search",
      "scrape",
      "analyze",
      "synthesize",
      "report",
    ];
    const stageProgress = stageOrder.map((kind) => {
      const s = stages[kind];
      if (s.status === "complete") return 1;
      if (!s.totals.target) return s.status === "active" ? 0.1 : 0;
      return Math.min(1, s.totals.succeeded / s.totals.target);
    });
    const totalWeight = stageProgress.length;
    const aggregateProgress =
      stageProgress.reduce((a, b) => a + b, 0) / totalWeight;

    return {
      activeStage: state.activeStage,
      aggregateProgress,
      etaSeconds,
      rate,
      totalSourcesDiscovered,
      totalCharsScraped,
      totalAnalysesCompleted,
      uniqueModels: Array.from(uniqueModelsSet),
      uniqueAgents: Array.from(uniqueAgentsSet),
      dedupLabel,
      runningCostUsd,
    };
  }, [state, topic]);

  return { state, derived, dispatch, dispatchInfo, dispatchPhase, reset };
}
