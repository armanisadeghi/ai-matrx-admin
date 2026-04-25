"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Globe,
  Clock,
  Copy,
  Check,
  CheckCircle,
  Loader2,
  Link2,
  BookOpenCheck,
  ScanSearch,
} from "lucide-react";
import type { ToolRendererProps } from "../../types";
import {
  collectMessages,
  filterStepEvents,
  isTerminal,
  resultAsString,
} from "../_shared";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReadResult {
  url: string;
  readAt: string;
  title: string;
  text: string;
}

interface UnreadResult {
  title: string;
  url: string;
  snippet: string;
}

interface ParsedResearch {
  queries: string[];
  readResults: ReadResult[];
  unreadResults: UnreadResult[];
  curatedReport: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseResearchOutput(raw: string): ParsedResearch {
  // ── Queries from "Searched: …" line ────────────────────────────────────────
  const searchedLine = raw.match(/Searched:\s*(.+)/)?.[1] ?? "";
  const queries: string[] = [];
  const qRe = /"([^"]+)"\s*\(\d+\)/g;
  let qm: RegExpExecArray | null;
  while ((qm = qRe.exec(searchedLine)) !== null) queries.push(qm[1]);

  // ── Curated report ──────────────────────────────────────────────────────────
  const CURATED_MARKER = "# Curated Research Results";
  const NEXT_STEPS_MARKER = "\n## Next steps:";
  const curatedStart = raw.indexOf(CURATED_MARKER);
  let curatedReport = "";
  if (curatedStart !== -1) {
    const after = raw.slice(curatedStart + CURATED_MARKER.length);
    const nsIdx = after.indexOf(NEXT_STEPS_MARKER);
    const reportRaw = (nsIdx !== -1 ? after.slice(0, nsIdx) : after).trim();
    curatedReport = reportRaw
      .replace(/^The following is the result of[^\n]*\n+/i, "")
      .trim();
  }

  // ── Per-result entries from "# All Search Results" section ─────────────────
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
    const queryBlocks = allResultsSection.split(/\n---\n(?=## )/);
    for (const block of queryBlocks) {
      if (!block.trim()) continue;
      if (
        block.startsWith(ALL_RESULTS_MARKER) ||
        block.startsWith(METRICS_MARKER)
      )
        continue;

      const firstBlankLine = block.indexOf("\n\n");
      if (firstBlankLine === -1) continue;
      const resultsSection = block.slice(firstBlankLine + 2);
      const entries = resultsSection.split(/\n\n(?=Title: )/);

      for (const entry of entries) {
        if (!entry.includes("Title:")) continue;

        const titleLine = entry.match(/^Title: (.+)/m)?.[1]?.trim() ?? "";
        const url = entry.match(/^URL: (.+)/m)?.[1]?.trim() ?? "";
        const description =
          entry.match(/^Description: (.+)/m)?.[1]?.trim() ?? "";
        const snippets =
          entry.match(/^Extra Snippets: (.+)/m)?.[1]?.trim() ?? "";

        if (!titleLine && !url) continue;

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

  return { queries, readResults, unreadResults: [], curatedReport };
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Live browsing card (shown while research is in progress)
// ─────────────────────────────────────────────────────────────────────────────

function BrowsingCard({
  url,
  index,
  isLast,
  isComplete,
}: {
  url: string;
  index: number;
  isLast: boolean;
  isComplete: boolean;
}) {
  const domain = getDomain(url);
  const favicon = getFaviconUrl(url);
  const isActivelyReading = isLast && !isComplete;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all animate-in fade-in slide-in-from-left ${
        isActivelyReading
          ? "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-300 dark:border-violet-700 shadow-sm"
          : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
      }`}
      style={{
        animationDelay: `${index * 80}ms`,
        animationDuration: "300ms",
        animationFillMode: "backwards",
      }}
    >
      {/* Favicon */}
      <div className="flex-shrink-0 w-5 h-5 relative">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className="w-5 h-5 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const sibling = (e.target as HTMLImageElement).nextElementSibling;
              if (sibling) sibling.classList.remove("hidden");
            }}
          />
        ) : null}
        <Globe
          className={`w-5 h-5 text-slate-400 dark:text-slate-500 ${favicon ? "hidden" : ""}`}
        />
      </div>

      {/* Domain */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[240px] hover:text-violet-600 dark:hover:text-violet-400"
        title={url}
      >
        {domain}
      </a>

      {/* Status indicator */}
      <div className="ml-auto flex-shrink-0">
        {isActivelyReading ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              Reading
            </span>
            <div className="flex gap-0.5">
              <span
                className="w-1 h-1 rounded-full bg-violet-500 dark:bg-violet-400"
                style={{
                  animation: "pulseWave 1.4s infinite ease-in-out",
                }}
              />
              <span
                className="w-1 h-1 rounded-full bg-violet-500 dark:bg-violet-400"
                style={{
                  animation: "pulseWave 1.4s infinite ease-in-out 0.2s",
                }}
              />
              <span
                className="w-1 h-1 rounded-full bg-violet-500 dark:bg-violet-400"
                style={{
                  animation: "pulseWave 1.4s infinite ease-in-out 0.4s",
                }}
              />
            </div>
          </div>
        ) : (
          <BookOpenCheck className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const DeepResearchInline: React.FC<ToolRendererProps> = ({
  entry,
  events,
  onOpenOverlay,
  toolGroupId = "default",
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isComplete = isTerminal(entry);

  const resultText = resultAsString(entry);
  const parsed = resultText ? parseResearchOutput(resultText) : null;
  const readResults = parsed?.readResults ?? [];
  const unreadResults = parsed?.unreadResults ?? [];
  const displayResults = readResults.slice(0, 4);

  // Browsing URLs come from progress messages ("Browsing <url>") during the
  // stream.  Summarizing state comes from a tool_step event.
  const browsingUrls = collectMessages(events)
    .filter((m) => m.startsWith("Browsing "))
    .map((m) => m.replace("Browsing ", ""));

  const isSummarizing = filterStepEvents(events).some(
    (e) => (e.metadata as Record<string, unknown>)?.status === "summarizing",
  );

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Status Bar */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        {isComplete ? (
          <>
            <CheckCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="font-medium">
              Researched {readResults.length}{" "}
              {readResults.length === 1 ? "page" : "pages"}
              {unreadResults.length > 0 &&
                ` + ${unreadResults.length} more found`}
            </span>
          </>
        ) : isSummarizing ? (
          <>
            <ScanSearch className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="font-medium">
              Analyzing {browsingUrls.length} sources...
            </span>
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400" />
            <span className="font-medium">
              Deep reading{" "}
              {browsingUrls.length > 0
                ? `${browsingUrls.length} ${browsingUrls.length === 1 ? "page" : "pages"}`
                : ""}
              ...
            </span>
          </>
        )}
      </div>

      {/* Live Browsing Progress — show each URL as it arrives */}
      {!isComplete && browsingUrls.length > 0 && (
        <div className="space-y-1.5">
          {browsingUrls.map((url, index) => (
            <BrowsingCard
              key={url + index}
              url={url}
              index={index}
              isLast={index === browsingUrls.length - 1}
              isComplete={isComplete}
            />
          ))}
        </div>
      )}

      {/* Read Result Cards — show after complete */}
      {isComplete && displayResults.length > 0 && (
        <div className="space-y-2">
          {displayResults.map((result, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-gradient-to-r from-violet-50/60 to-purple-50/60 dark:from-violet-950/15 dark:to-purple-950/15 border border-violet-200 dark:border-violet-800/60 animate-in fade-in slide-in-from-bottom"
              style={{
                animationDelay: `${index * 70}ms`,
                animationDuration: "300ms",
                animationFillMode: "backwards",
              }}
            >
              {/* Header row: domain + timestamp + copy */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-shrink-0 w-4 h-4 relative">
                  <img
                    src={getFaviconUrl(result.url)}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const sibling = (e.target as HTMLImageElement)
                        .nextElementSibling;
                      if (sibling) sibling.classList.remove("hidden");
                    }}
                  />
                  <Globe className="w-4 h-4 text-violet-500 dark:text-violet-400 hidden" />
                </div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline truncate"
                >
                  {getDomain(result.url)}
                </a>
                {result.readAt && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 ml-auto flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {result.readAt.replace(/,?\s*at\s*/i, " ")}
                    </span>
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(
                      `${result.title}\n${result.url}\n\n${result.text}`,
                      index,
                    );
                  }}
                  className="flex-shrink-0 p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                  title="Copy full content"
                >
                  {copiedIndex === index ? (
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400" />
                  )}
                </button>
              </div>

              {/* Title */}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-300 line-clamp-1 mb-1"
              >
                {result.title || getDomain(result.url)}
              </a>

              {/* Text Preview */}
              {result.text && (
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {result.text.slice(0, 200)}
                </p>
              )}
            </div>
          ))}

          {/* Extra results note */}
          {readResults.length > 4 && (
            <div
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500 px-1 animate-in fade-in"
              style={{
                animationDelay: `${displayResults.length * 70}ms`,
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>+{readResults.length - 4} more pages read</span>
            </div>
          )}

          {/* Unread results note */}
          {unreadResults.length > 0 && (
            <div
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500 px-1 animate-in fade-in"
              style={{
                animationDelay: `${(displayResults.length + 1) * 70}ms`,
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{unreadResults.length} additional sources available</span>
            </div>
          )}
        </div>
      )}

      {/* View Full Research Button */}
      {isComplete && onOpenOverlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenOverlay(`tool-group-${toolGroupId}`);
          }}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 text-violet-700 dark:text-violet-300 text-sm font-medium hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer animate-in fade-in slide-in-from-bottom"
          style={{
            animationDelay: `${Math.min(displayResults.length, 4) * 70 + 100}ms`,
            animationDuration: "300ms",
            animationFillMode: "backwards",
          }}
        >
          <BookOpen className="w-4 h-4" />
          <span>
            View complete research
            {readResults.length + unreadResults.length > 0 &&
              ` (${readResults.length} read${unreadResults.length > 0 ? `, ${unreadResults.length} more` : ""})`}
          </span>
        </button>
      )}
    </div>
  );
};
