/**
 * Layer 3 — Streaming JSON Tracker
 *
 * Stateful wrapper around extractAllJson that tracks changes across
 * streaming chunks and avoids dispatching redundant updates.
 */

import {
  extractAllJson,
  type ExtractedJson,
  type ExtractionOptions,
} from "./extract-json";

// =============================================================================
// Types
// =============================================================================

export interface StreamingJsonState {
  results: ExtractedJson[];
  /** True when all detected structures have balanced braces/brackets */
  isAllComplete: boolean;
  /** True when we've detected an open ```json fence without a close */
  hasOpenFence: boolean;
  /** Monotonically increasing — bumped only when results actually change */
  revision: number;
  /** The accumulated text so far */
  textLength: number;
}

export interface StreamingJsonTrackerOptions {
  /** Max results to track. Default Infinity. */
  maxResults?: number;
  /** Apply repair strategies. Default true. */
  repairEnabled?: boolean;
  /** Enable fuzzy matching on finalize. Default true. */
  fuzzyOnFinalize?: boolean;
}

// =============================================================================
// Tracker
// =============================================================================

const INITIAL_STATE: StreamingJsonState = {
  results: [],
  isAllComplete: true,
  hasOpenFence: false,
  revision: 0,
  textLength: 0,
};

export class StreamingJsonTracker {
  private text = "";
  private state: StreamingJsonState = { ...INITIAL_STATE };
  private opts: Required<StreamingJsonTrackerOptions>;
  private lastResultsHash = "";

  constructor(options?: StreamingJsonTrackerOptions) {
    this.opts = {
      maxResults: options?.maxResults ?? Infinity,
      repairEnabled: options?.repairEnabled ?? true,
      fuzzyOnFinalize: options?.fuzzyOnFinalize ?? true,
    };
  }

  /**
   * Append a new chunk of text and re-extract. Returns the new state.
   * Only bumps `revision` if the extraction results actually changed.
   */
  append(chunk: string): StreamingJsonState {
    this.text += chunk;
    return this.extract(true);
  }

  /**
   * Run a final extraction pass with full strategies (including fuzzy).
   * Call once when the stream is complete.
   */
  finalize(): StreamingJsonState {
    return this.extract(false);
  }

  /** Replace the entire accumulated text (useful if you manage accumulation externally). */
  setFullText(text: string): StreamingJsonState {
    this.text = text;
    return this.extract(true);
  }

  /** Get the current state without re-extracting. */
  getState(): StreamingJsonState {
    return this.state;
  }

  /** Get the accumulated text. */
  getText(): string {
    return this.text;
  }

  /** Reset to initial state. */
  reset(): void {
    this.text = "";
    this.state = { ...INITIAL_STATE };
    this.lastResultsHash = "";
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private extract(isStreaming: boolean): StreamingJsonState {
    const options: ExtractionOptions = {
      isStreaming,
      allowFuzzy: isStreaming ? false : this.opts.fuzzyOnFinalize,
      maxResults: this.opts.maxResults,
      repairEnabled: this.opts.repairEnabled,
    };

    const results = extractAllJson(this.text, options);
    const hash = this.computeHash(results);

    if (hash !== this.lastResultsHash) {
      this.lastResultsHash = hash;
      this.state = {
        results,
        isAllComplete: results.every((r) => r.isComplete),
        hasOpenFence: results.some(
          (r) => r.source === "fenced" && !r.isComplete,
        ),
        revision: this.state.revision + 1,
        textLength: this.text.length,
      };
    } else {
      this.state = {
        ...this.state,
        textLength: this.text.length,
      };
    }

    return this.state;
  }

  /**
   * Cheap hash of extraction results for change detection.
   * We hash on: count, types, completeness, and the stringified values.
   * This avoids deep-equality checks on every chunk.
   */
  private computeHash(results: ExtractedJson[]): string {
    if (results.length === 0) return "empty";

    const parts: string[] = [];
    for (const r of results) {
      parts.push(
        `${r.type}:${r.source}:${r.isComplete}:${r.startIndex}-${r.endIndex}`,
      );
      try {
        parts.push(JSON.stringify(r.value));
      } catch {
        parts.push("unstringifiable");
      }
    }
    return parts.join("|");
  }
}
