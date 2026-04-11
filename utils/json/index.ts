/**
 * utils/json — Unified JSON extraction, repair, and streaming toolkit.
 *
 * Layer 0: json-structural.ts   — character-level primitives (balancing, fences)
 * Layer 1: extract-json.ts      — core extractor (extractAllJson)
 * Layer 2: json-utils.ts        — repair, formatting, flexible parse
 * Layer 3: streaming-json-tracker.ts — stateful streaming wrapper
 * Hook:    hooks/use-streaming-json.ts — React hook for streaming
 *
 * Other:   json-cleaner-utility.ts — circular-ref-safe deep clean
 *          safeStringify.ts        — depth-limited stringify
 */

// ── Layer 0: Structural Primitives ──────────────────────────────────────────
export {
  findBalancedEnd,
  computeClosingSequence,
  findAllFencedBlocks,
  findBareJsonCandidates,
  type BalanceResult,
  type FencedBlock,
  type BareJsonCandidate,
} from "./json-structural";

// ── Layer 1: Core Extractor ─────────────────────────────────────────────────
export {
  extractAllJson,
  extractFirstJson,
  extractFirstObject,
  containsJson,
  type ExtractedJson,
  type ExtractionOptions,
  type JsonValueType,
  type JsonSource,
} from "./extract-json";

// ── Layer 2: Repair & Utilities ─────────────────────────────────────────────
export {
  pythonToJson,
  flexibleJsonParse,
  safeJsonStringify,
  isValidJson,
  formatJson,
  minifyJson,
  deepClone,
  valueToString,
  hasContent,
  attemptJsonClose,
  stripKeys,
  type JsonConversionResult,
  type JsonCloseResult,
} from "./json-utils";

// ── Layer 3: Streaming Tracker ──────────────────────────────────────────────
export {
  StreamingJsonTracker,
  type StreamingJsonState,
  type StreamingJsonTrackerOptions,
} from "./streaming-json-tracker";

// ── Other utilities ─────────────────────────────────────────────────────────
export {
  cleanJson,
  formatJson as formatJsonClean,
} from "./json-cleaner-utility";
export {
  safeStringify,
  safeStringifyDepthLimit,
  safeStringifyWithTimeout,
} from "./safeStringify";
