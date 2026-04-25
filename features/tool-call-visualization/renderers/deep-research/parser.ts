/**
 * Deep-research output parser.
 *
 * The Python tool emits a long markdown blob with the following structure:
 *
 *   Comprehensive research using the following queries: …
 *
 *   # All Search Results:
 *
 *   Searched: "query1" (N), "query2" (N), …
 *
 *   ---
 *   ## "query1" (N results)
 *
 *   Title: Some Title (date info)
 *   URL: https://…
 *   Description: Single-line description
 *   Extra Snippets: Very long single-line snippet text
 *   …
 *
 *   ---
 *   ## Search Summary Metrics:
 *   Query count: N
 *   Results count: N
 *   Total character count: N
 *   ---
 *
 *   # Curated Research Results
 *
 *   The following is the result of successfully scraping N pages …
 *
 *   [Markdown report with ### headings, bullet points, etc.]
 *
 *   ## Next steps:
 *   …
 *
 * `parseResearchOutput` extracts each section into a structured shape so the
 * Report / Sources / Full-Text tabs can render their respective slices
 * without each re-running the parser.
 *
 * `parseResearchEntry` adds a per-entry WeakMap cache so the parser is run
 * exactly once per ToolLifecycleEntry instance even when several tabs
 * consume it.
 */

import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";

import { resultAsString } from "../_shared";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadResult {
  url: string;
  /** Parsed from trailing "(date)" in the title line, e.g. "1 day ago". */
  readAt: string;
  title: string;
  /** Description + Extra Snippets joined together. */
  text: string;
}

export interface UnreadResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ParsedResearch {
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
// ─────────────────────────────────────────────────────────────────────────────

export function parseResearchOutput(raw: string): ParsedResearch {
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

  // ── 3. Curated report ───────────────────────────────────────────────────────
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

  // ── 4. Metrics ──────────────────────────────────────────────────────────────
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

  // ── 5. Per-result entries from "# All Search Results" section ───────────────
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

  return {
    introSummary,
    queries,
    readResults,
    unreadResults: [],
    curatedReport,
    metrics,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-entry cache
//
// Each ToolLifecycleEntry instance is parsed exactly once, regardless of how
// many tabs render it. The cache is keyed by entry identity and clears
// automatically when the entry is garbage-collected.
// ─────────────────────────────────────────────────────────────────────────────

const parseCache = new WeakMap<ToolLifecycleEntry, ParsedResearch | null>();

/**
 * Parse a tool lifecycle entry's result into structured research data.
 * Returns `null` when the entry has no usable result yet.
 */
export function parseResearchEntry(
  entry: ToolLifecycleEntry,
): ParsedResearch | null {
  if (parseCache.has(entry)) return parseCache.get(entry) ?? null;

  const raw = resultAsString(entry);
  const parsed = raw ? parseResearchOutput(raw) : null;
  parseCache.set(entry, parsed);
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}
