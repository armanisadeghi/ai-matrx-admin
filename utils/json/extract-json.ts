/**
 * Layer 1 — Core JSON Extractor
 *
 * Single source of truth for "pull JSON from text / markdown."
 * Always returns an array. Supports streaming and non-streaming modes.
 * Never throws — failures are represented as empty results or warnings.
 */

import {
  findAllFencedBlocks,
  findBareJsonCandidates,
  computeClosingSequence,
  type FencedBlock,
} from "./json-structural";

// =============================================================================
// Public Types
// =============================================================================

export type JsonValueType = "object" | "array" | "primitive";
export type JsonSource = "fenced" | "bare-block" | "inline" | "whole-string";

export interface ExtractedJson {
  value: unknown;
  type: JsonValueType;
  source: JsonSource;
  startIndex: number;
  endIndex: number;
  isComplete: boolean;
  repairApplied: boolean;
  warnings: string[];
}

export interface ExtractionOptions {
  /** When true, only uses conservative strategies (fenced blocks). Default false. */
  isStreaming?: boolean;
  /** Enable bare-block / inline / whole-string fallbacks. Default false. */
  allowFuzzy?: boolean;
  /** Max number of results to return. Default Infinity. */
  maxResults?: number;
  /** Apply repair strategies (trailing commas, Python syntax, etc.). Default true. */
  repairEnabled?: boolean;
}

// =============================================================================
// Repair Helpers (lightweight — heavier repair lives in json-utils.ts)
// =============================================================================

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function tryRepairAndParse(
  text: string,
): { value: unknown; repaired: boolean } | undefined {
  const direct = tryParse(text);
  if (direct !== undefined) return { value: direct, repaired: false };

  let repaired = text;

  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

  const result = tryParse(repaired);
  if (result !== undefined) return { value: result, repaired: true };

  repaired = text;
  repaired = repaired.replace(/\bTrue\b/g, "true");
  repaired = repaired.replace(/\bFalse\b/g, "false");
  repaired = repaired.replace(/\bNone\b/g, "null");
  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

  const result2 = tryParse(repaired);
  if (result2 !== undefined) return { value: result2, repaired: true };

  return undefined;
}

function classifyValue(value: unknown): JsonValueType {
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  return "primitive";
}

// =============================================================================
// Strategy: Fenced Blocks
// =============================================================================

function extractFromFencedBlocks(
  text: string,
  blocks: FencedBlock[],
  opts: Required<ExtractionOptions>,
): ExtractedJson[] {
  const results: ExtractedJson[] = [];

  const jsonBlocks = blocks.filter(
    (b) => b.language === "json" || b.language === "",
  );

  for (const block of jsonBlocks) {
    if (results.length >= opts.maxResults) break;

    const content = block.content.trim();
    if (!content) continue;

    if (block.isComplete) {
      const parsed = opts.repairEnabled
        ? tryRepairAndParse(content)
        : (() => {
            const v = tryParse(content);
            return v !== undefined ? { value: v, repaired: false } : undefined;
          })();

      if (parsed !== undefined) {
        results.push({
          value: parsed.value,
          type: classifyValue(parsed.value),
          source: "fenced",
          startIndex: block.fenceStart,
          endIndex: block.fenceEnd,
          isComplete: true,
          repairApplied: parsed.repaired,
          warnings: parsed.repaired
            ? ["Repair applied (trailing comma or Python syntax)"]
            : [],
        });
      }
    } else if (opts.isStreaming) {
      const attempted = attemptStreamingClose(content, opts.repairEnabled);
      if (attempted) {
        results.push({
          value: attempted.value,
          type: classifyValue(attempted.value),
          source: "fenced",
          startIndex: block.fenceStart,
          endIndex: block.fenceEnd,
          isComplete: false,
          repairApplied: attempted.repaired,
          warnings: [
            "Incomplete fenced block — auto-closed for streaming preview",
          ],
        });
      }
    }
  }

  return results;
}

/**
 * For streaming: try to close an incomplete JSON string and parse it.
 * Attempts multiple strategies to produce valid JSON from a partial string.
 */
function attemptStreamingClose(
  content: string,
  repairEnabled: boolean,
): { value: unknown; repaired: boolean } | undefined {
  const candidates = buildStreamingCloseCandidates(content.trim());

  for (const candidate of candidates) {
    if (repairEnabled) {
      const result = tryRepairAndParse(candidate);
      if (result) return { value: result.value, repaired: true };
    }
    const direct = tryParse(candidate);
    if (direct !== undefined) return { value: direct, repaired: true };
  }

  return undefined;
}

/**
 * Generate candidate strings by closing the partial JSON in different ways.
 * Handles: unclosed strings, dangling keys (no value), trailing commas, etc.
 */
function buildStreamingCloseCandidates(text: string): string[] {
  const candidates: string[] = [];

  const inString = isInsideString(text);

  // Strategy 1: close string + add null for dangling key + close structures
  if (inString) {
    const withQuote = text + '"';
    const closingA = computeClosingSequence(withQuote);
    candidates.push(withQuote + ": null" + closingA);
    candidates.push(withQuote + closingA);
  }

  // Strategy 2: truncate at last valid comma/colon boundary + close
  const lastClean = findLastCleanBreak(text);
  if (lastClean > 0 && lastClean < text.length) {
    const truncated = text.slice(0, lastClean);
    const closingB = computeClosingSequence(truncated);
    candidates.push(truncated + closingB);
  }

  // Strategy 3: raw close (whatever we have + closing chars)
  const closingC = computeClosingSequence(text);
  if (closingC) {
    candidates.push(text + closingC);
  }

  // Strategy 4: if not in string, try as-is
  if (!inString && !computeClosingSequence(text)) {
    candidates.push(text);
  }

  return candidates;
}

/**
 * Find the last position where truncating produces valid JSON context.
 * Looks backward for a comma, closing brace/bracket, or colon+value boundary.
 */
function findLastCleanBreak(text: string): number {
  let inStr = false;
  let escapeNext = false;
  let lastBreak = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      if (inStr) escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;

    if (ch === "," || ch === "}" || ch === "]") {
      lastBreak = i + 1;
    }
  }

  return lastBreak;
}

/**
 * Heuristic: check if the string ends inside an unclosed JSON string literal.
 */
function isInsideString(text: string): boolean {
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
    }
  }

  return inString;
}

// =============================================================================
// Strategy: Bare Blocks (JSON not inside fences)
// =============================================================================

function extractFromBareBlocks(
  text: string,
  fencedBlocks: FencedBlock[],
  opts: Required<ExtractionOptions>,
): ExtractedJson[] {
  const results: ExtractedJson[] = [];

  const excludeRanges: Array<[number, number]> = fencedBlocks.map((b) => [
    b.fenceStart,
    b.fenceEnd,
  ]);

  const candidates = findBareJsonCandidates(text, excludeRanges);

  for (const candidate of candidates) {
    if (results.length >= opts.maxResults) break;

    if (!candidate.isComplete) continue;

    const raw = text.slice(candidate.startIndex, candidate.endIndex + 1);
    const parsed = opts.repairEnabled
      ? tryRepairAndParse(raw)
      : (() => {
          const v = tryParse(raw);
          return v !== undefined ? { value: v, repaired: false } : undefined;
        })();

    if (parsed !== undefined) {
      results.push({
        value: parsed.value,
        type: classifyValue(parsed.value),
        source: "bare-block",
        startIndex: candidate.startIndex,
        endIndex: candidate.endIndex + 1,
        isComplete: true,
        repairApplied: parsed.repaired,
        warnings: parsed.repaired
          ? ["Repair applied to bare JSON block"]
          : ["JSON found without code fence markers"],
      });
    }
  }

  return results;
}

// =============================================================================
// Strategy: Whole-String
// =============================================================================

function extractFromWholeString(
  text: string,
  opts: Required<ExtractionOptions>,
): ExtractedJson[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parsed = opts.repairEnabled
    ? tryRepairAndParse(trimmed)
    : (() => {
        const v = tryParse(trimmed);
        return v !== undefined ? { value: v, repaired: false } : undefined;
      })();

  if (parsed !== undefined) {
    return [
      {
        value: parsed.value,
        type: classifyValue(parsed.value),
        source: "whole-string",
        startIndex: 0,
        endIndex: text.length,
        isComplete: true,
        repairApplied: parsed.repaired,
        warnings: [
          "Entire input parsed as JSON (no fences or structure detected)",
        ],
      },
    ];
  }

  return [];
}

// =============================================================================
// Main Entry Point
// =============================================================================

const DEFAULTS: Required<ExtractionOptions> = {
  isStreaming: false,
  allowFuzzy: false,
  maxResults: Infinity,
  repairEnabled: true,
};

/**
 * Extract all JSON values from a text / markdown string.
 *
 * Strategy order depends on mode:
 *
 * **Streaming (`isStreaming: true`)**:
 *   1. Fenced blocks only (with auto-close for incomplete blocks)
 *
 * **Non-streaming (`isStreaming: false`)**:
 *   1. Fenced blocks (complete only)
 *   2. If `allowFuzzy` and still below `maxResults`: bare blocks
 *   3. If `allowFuzzy` and still no results: whole-string parse
 *
 * @returns Array of extracted JSON values, in document order. Empty if none found.
 */
export function extractAllJson(
  text: string,
  options?: ExtractionOptions,
): ExtractedJson[] {
  if (!text || typeof text !== "string") return [];

  const opts: Required<ExtractionOptions> = { ...DEFAULTS, ...options };
  const allFenced = findAllFencedBlocks(text);

  // Strategy 1: Fenced blocks (always runs)
  const fencedResults = extractFromFencedBlocks(text, allFenced, opts);

  if (fencedResults.length >= opts.maxResults) {
    return fencedResults.slice(0, opts.maxResults);
  }

  if (opts.isStreaming) {
    return fencedResults;
  }

  // Strategy 2: Bare blocks (non-streaming, when fuzzy allowed OR no fenced results)
  const remaining = opts.maxResults - fencedResults.length;
  let bareResults: ExtractedJson[] = [];

  if (opts.allowFuzzy || fencedResults.length === 0) {
    bareResults = extractFromBareBlocks(text, allFenced, {
      ...opts,
      maxResults: remaining,
    });
  }

  const combined = [...fencedResults, ...bareResults];
  if (combined.length >= opts.maxResults) {
    return combined.slice(0, opts.maxResults);
  }

  // Strategy 3: Whole-string (non-streaming, fuzzy, still no results)
  if (opts.allowFuzzy && combined.length === 0) {
    const wholeResults = extractFromWholeString(text, opts);
    return wholeResults.slice(0, opts.maxResults);
  }

  return combined;
}

// =============================================================================
// Convenience Helpers
// =============================================================================

/**
 * Extract the first JSON object from text. Returns `null` if none found.
 * This is the drop-in replacement for legacy `extractJsonFromText`.
 */
export function extractFirstJson(
  text: string,
  options?: ExtractionOptions,
): ExtractedJson | null {
  const results = extractAllJson(text, { ...options, maxResults: 1 });
  return results[0] ?? null;
}

/**
 * Extract the first JSON object (not array, not primitive) from text.
 */
export function extractFirstObject(
  text: string,
  options?: ExtractionOptions,
): ExtractedJson | null {
  const results = extractAllJson(text, options);
  return results.find((r) => r.type === "object") ?? null;
}

/**
 * Quick "does this text contain extractable JSON?" check.
 * Cheaper than full extraction when you only need a boolean.
 */
export function containsJson(
  text: string,
  options?: ExtractionOptions,
): boolean {
  return extractAllJson(text, { ...options, maxResults: 1 }).length > 0;
}
