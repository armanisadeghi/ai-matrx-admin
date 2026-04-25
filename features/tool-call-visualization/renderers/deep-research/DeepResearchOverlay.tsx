"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Globe,
  ExternalLink,
  Clock,
  Copy,
  Check,
  LayoutGrid,
  FileText,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import MarkdownStream from "@/components/MarkdownStream";
import type { ToolRendererProps } from "../../types";
import { resultAsString } from "../_shared";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReadResult {
  url: string;
  /** Parsed from trailing "(date)" in the title line, e.g. "1 day ago". */
  readAt: string;
  title: string;
  /** Description + Extra Snippets joined together. */
  text: string;
}

interface UnreadResult {
  title: string;
  url: string;
  snippet: string;
}

interface ParsedResearch {
  /** First paragraph: "Comprehensive research using the following queries: …" */
  introSummary: string;
  /** Queries extracted from the "Searched: …" line. */
  queries: string[];
  /** All per-result entries from the "# All Search Results" section. */
  readResults: ReadResult[];
  /** Kept for backward-compatibility; always empty in this format. */
  unreadResults: UnreadResult[];
  /**
   * Full markdown report from the "# Curated Research Results" section —
   * the synthesized, agent-generated answer the user actually wants to read.
   */
  curatedReport: string;
  metrics: {
    queryCount: number;
    resultsCount: number;
    totalCharCount: number;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
//
// Actual output format (as of 2026-04):
//
//   Comprehensive research using the following queries: …
//
//   # All Search Results:
//
//   Searched: "query1" (N), "query2" (N), …
//
//   ---
//   ## "query1" (N results)
//
//   Title: Some Title (date info)
//   URL: https://…
//   Description: Single-line description
//   Extra Snippets: Very long single-line snippet text
//
//   Title: Next Result
//   …
//
//   ---
//   ## Search Summary Metrics:
//   Query count: N
//   Results count: N
//   Total character count: N
//   ---
//
//   # Curated Research Results
//
//   The following is the result of successfully scraping N pages …
//
//   [Markdown report with ### headings, bullet points, etc.]
//
//   ## Next steps:
//   …
// ─────────────────────────────────────────────────────────────────────────────

function parseResearchOutput(raw: string): ParsedResearch {
  // ── 1. Intro summary ────────────────────────────────────────────────────────
  const introMatch = raw.match(
    /^(Comprehensive research[^\n]*(?:\n(?!#)[^\n]*)*)/,
  );
  const introSummary = introMatch?.[1]?.trim() ?? "";

  // ── 2. Queries from "Searched: …" line ──────────────────────────────────────
  const searchedLine = raw.match(/Searched:\s*(.+)/)?.[1] ?? "";
  const queries: string[] = [];
  const qRe = /"([^"]+)"\s*\(\d+\)/g;
  let qm: RegExpExecArray | null;
  while ((qm = qRe.exec(searchedLine)) !== null) queries.push(qm[1]);

  // ── 3. Curated report ────────────────────────────────────────────────────────
  const CURATED_MARKER = "# Curated Research Results";
  const NEXT_STEPS_MARKER = "\n## Next steps:";
  const curatedStart = raw.indexOf(CURATED_MARKER);
  let curatedReport = "";
  if (curatedStart !== -1) {
    const afterCurated = raw.slice(curatedStart + CURATED_MARKER.length);
    const nsIdx = afterCurated.indexOf(NEXT_STEPS_MARKER);
    const reportRaw = (
      nsIdx !== -1 ? afterCurated.slice(0, nsIdx) : afterCurated
    ).trim();
    // Strip the "The following is the result of…" intro line if present.
    curatedReport = reportRaw
      .replace(/^The following is the result of[^\n]*\n+/i, "")
      .trim();
  }

  // ── 4. Metrics ───────────────────────────────────────────────────────────────
  let metrics: ParsedResearch["metrics"] = null;
  const metricsMatch = raw.match(
    /## Search Summary Metrics:\s*\n+([\s\S]*?)(?:\n---|\n#|$)/,
  );
  if (metricsMatch) {
    const m = metricsMatch[1];
    const qc = parseInt(m.match(/Query count:\s*(\d+)/)?.[1] ?? "0", 10);
    const rc = parseInt(m.match(/Results count:\s*(\d+)/)?.[1] ?? "0", 10);
    const cc = parseInt(
      m.match(/Total character count:\s*(\d+)/)?.[1] ?? "0",
      10,
    );
    if (qc || rc || cc)
      metrics = { queryCount: qc, resultsCount: rc, totalCharCount: cc };
  }

  // ── 5. Per-result entries from "# All Search Results" section ────────────────
  const ALL_RESULTS_MARKER = "# All Search Results:";
  const METRICS_MARKER = "## Search Summary Metrics:";
  const allResStart = raw.indexOf(ALL_RESULTS_MARKER);
  const metricsPos = raw.indexOf(METRICS_MARKER);
  let allResultsSection = "";
  if (allResStart !== -1) {
    const end =
      metricsPos !== -1
        ? metricsPos
        : curatedStart !== -1
          ? curatedStart
          : raw.length;
    allResultsSection = raw.slice(allResStart, end);
  }

  const readResults: ReadResult[] = [];

  if (allResultsSection) {
    // Each query group starts after "---\n## ".
    const queryBlocks = allResultsSection.split(/\n---\n(?=## )/);

    for (const block of queryBlocks) {
      if (!block.trim()) continue;

      // Skip the opening "# All Search Results:" block and metrics block.
      if (
        block.startsWith(ALL_RESULTS_MARKER) ||
        block.startsWith(METRICS_MARKER)
      )
        continue;

      // Content after the "## …" header line + blank line.
      const firstBlankLine = block.indexOf("\n\n");
      if (firstBlankLine === -1) continue;
      const resultsSection = block.slice(firstBlankLine + 2);

      // Split into individual entries on blank-line-then-"Title: ".
      const entries = resultsSection.split(/\n\n(?=Title: )/);

      for (const entry of entries) {
        if (!entry.includes("Title:")) continue;

        const titleLine = entry.match(/^Title: (.+)/m)?.[1]?.trim() ?? "";
        const url = entry.match(/^URL: (.+)/m)?.[1]?.trim() ?? "";
        const description =
          entry.match(/^Description: (.+)/m)?.[1]?.trim() ?? "";
        // Extra Snippets is a single very long line.
        const snippets =
          entry.match(/^Extra Snippets: (.+)/m)?.[1]?.trim() ?? "";

        if (!titleLine && !url) continue;

        // Separate the date annotation "(1 day ago)" from the title.
        const dateMatch = titleLine.match(/\(([^)]+)\)\s*$/);
        const readAt = dateMatch?.[1] ?? "";
        const title = titleLine.replace(/\s*\([^)]+\)\s*$/, "").trim();

        readResults.push({
          url,
          readAt,
          title: title || url,
          text: [description, snippets].filter(Boolean).join("\n\n"),
        });
      }
    }
  }

  console.log("[DEEP RESEARCH OVERLAY] parsed:", {
    queries,
    readResultCount: readResults.length,
    hasCuratedReport: curatedReport.length > 0,
    metrics,
  });

  return {
    introSummary,
    queries,
    readResults,
    unreadResults: [],
    curatedReport,
    metrics,
  };
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible text helper
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSED_CHAR_LIMIT = 500;

function CollapsibleText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COLLAPSED_CHAR_LIMIT;

  return (
    <div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {expanded || !isLong
          ? text
          : text.slice(0, COLLAPSED_CHAR_LIMIT) + "..."}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show full content ({Math.round(text.length / 1000)}k chars)
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const DeepResearchOverlay: React.FC<ToolRendererProps> = ({ entry }) => {
  const [viewMode, setViewMode] = useState<"report" | "cards" | "fulltext">(
    "report",
  );
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const resultText = resultAsString(entry);
  const parsed = useMemo(
    () => (resultText ? parseResearchOutput(resultText) : null),
    [resultText],
  );

  const readResults = parsed?.readResults ?? [];
  const unreadResults = parsed?.unreadResults ?? [];

  // ── Full text generation ────────────────────────────────────────────────

  const fullText = useMemo(() => {
    if (!parsed) return "";
    let text = "";

    if (parsed.queries.length > 0) {
      text += `RESEARCH QUERIES\n${"=".repeat(80)}\n`;
      parsed.queries.forEach((q, i) => {
        text += `${i + 1}. ${q}\n`;
      });
      text += "\n";
    } else if (parsed.introSummary) {
      text += `RESEARCH SUMMARY\n${"=".repeat(80)}\n${parsed.introSummary}\n\n`;
    }

    if (parsed.curatedReport) {
      text += `CURATED REPORT\n${"=".repeat(80)}\n\n${parsed.curatedReport}\n\n`;
    }

    if (readResults.length > 0) {
      text += `SEARCH RESULTS (${readResults.length})\n${"=".repeat(80)}\n\n`;
      readResults.forEach((r, i) => {
        text += `${i + 1}. ${r.title}\n`;
        text += `   URL: ${r.url}\n`;
        if (r.readAt) text += `   Retrieved: ${r.readAt}\n`;
        if (r.text) text += `\n${r.text}\n`;
        text += `\n${"-".repeat(80)}\n\n`;
      });
    }

    return text;
  }, [parsed, readResults]);

  // ── Copy handlers ───────────────────────────────────────────────────────

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyAllSuccess(true);
      setTimeout(() => setCopyAllSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyCard = async (result: ReadResult, index: number) => {
    try {
      const text = `${result.title}\n${result.url}\n\n${result.text}`;
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!parsed || (readResults.length === 0 && !parsed.curatedReport)) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No research data available</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const tabBtn = (
    mode: "report" | "cards" | "fulltext",
    icon: React.ReactNode,
    label: string,
  ) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors border border-border rounded-md ${
        viewMode === mode
          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="py-2 px-0 space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4">
        <div className="flex items-center gap-4 text-sm text-foreground">
          {parsed.queries.length > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>
                {parsed.queries.length}{" "}
                {parsed.queries.length === 1 ? "Query" : "Queries"}
              </span>
            </div>
          )}
          {readResults.length > 0 && (
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span>{readResults.length} Results</span>
            </div>
          )}
          {parsed.metrics && (
            <div className="flex items-center gap-2 text-xs text-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {parsed.metrics.resultsCount} total,{" "}
                {Math.round(parsed.metrics.totalCharCount / 1000)}k chars
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {parsed.curatedReport &&
            tabBtn("report", <FileText className="w-4 h-4" />, "Report")}
          {readResults.length > 0 &&
            tabBtn("cards", <LayoutGrid className="w-4 h-4" />, "Sources")}
          {tabBtn("fulltext", <FileText className="w-4 h-4" />, "Full Text")}

          {/* Copy All */}
          <button
            onClick={handleCopyAll}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-all border border-border rounded-md ${
              copyAllSuccess
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {copyAllSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Report View ───────────────────────────────────────────────── */}
      {viewMode === "report" && parsed.curatedReport && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
          {parsed.queries.length > 0 && (
            <div className="px-5 py-3 bg-violet-50/80 dark:bg-violet-950/20 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">
                Queries
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {parsed.queries.join(" · ")}
              </p>
            </div>
          )}
          <div className="p-5">
            <MarkdownStream
              content={parsed.curatedReport}
              hideCopyButton
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* ── Card View ─────────────────────────────────────────────────── */}
      {viewMode === "cards" && (
        <div className="space-y-5">
          {readResults.map((result, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-700 transition-colors overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-violet-50/80 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/15 border-b border-slate-200 dark:border-slate-700">
                <Globe className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline truncate"
                >
                  {getDomain(result.url)}
                </a>
                {result.readAt && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 ml-auto flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {result.readAt.replace(/,?\s*at\s*/i, " ")}
                  </span>
                )}
                <button
                  onClick={() => handleCopyCard(result, index)}
                  className="flex-shrink-0 p-1.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                  title="Copy this source"
                >
                  {copiedIndex === index ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400" />
                  )}
                </button>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3">
                {/* Title */}
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {result.title || getDomain(result.url)}
                </h3>

                {/* Collapsible Content */}
                {result.text && <CollapsibleText text={result.text} />}

                {/* Visit Source */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                  >
                    Read original article
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Unread Results Section */}
          {unreadResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 pt-2">
                <Link2 className="w-4 h-4" />
                <span>Additional Sources ({unreadResults.length})</span>
              </div>
              <div className="space-y-2">
                {unreadResults.map((result, index) => (
                  <a
                    key={index}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1">
                          {result.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-0.5">
                          <Globe className="w-3 h-3" />
                          <span className="truncate">
                            {getDomain(result.url)}
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {result.snippet && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5">
                            {result.snippet}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Full Text View ────────────────────────────────────────────── */}
      {viewMode === "fulltext" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="p-5">
            <MarkdownStream
              content={fullText}
              hideCopyButton
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
          {parsed.queries.length > 0
            ? `${parsed.queries.length} ${parsed.queries.length === 1 ? "query" : "queries"} · `
            : ""}
          {readResults.length > 0
            ? `${readResults.length} ${readResults.length === 1 ? "result" : "results"}`
            : ""}
          {parsed.curatedReport ? " · curated report included" : ""}
        </p>
      </div>
    </div>
  );
};
