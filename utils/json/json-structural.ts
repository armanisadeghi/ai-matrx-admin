/**
 * Layer 0 — Structural Primitives
 *
 * Pure character-level utilities that every higher layer depends on.
 * No JSON.parse calls live here — only scanning, balancing, and fence detection.
 */

// =============================================================================
// Brace / Bracket Balancing
// =============================================================================

export interface BalanceResult {
  endIndex: number;
  isComplete: boolean;
}

/**
 * Starting *after* the opening character at `startIndex`, walk the string
 * tracking depth, string literals, and escape sequences. Returns the index
 * of the matching close character or the end of the string if incomplete.
 *
 * `startIndex` must point at the opening `{` or `[`.
 */
export function findBalancedEnd(
  text: string,
  startIndex: number,
  openChar: "{" | "[",
  closeChar: "}" | "]",
): BalanceResult {
  let depth = 1;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex + 1; i < text.length; i++) {
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
      continue;
    }

    if (inString) continue;

    if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return { endIndex: i, isComplete: true };
      }
    }
  }

  return { endIndex: text.length - 1, isComplete: false };
}

/**
 * Count how many unclosed openers remain in a partial JSON string.
 * Returns the sequence of close characters needed (e.g. `"]}"` ).
 *
 * Handles string literals and escape sequences correctly.
 */
export function computeClosingSequence(text: string): string {
  const stack: string[] = [];
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
      continue;
    }

    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  return stack.reverse().join("");
}

// =============================================================================
// Fence Detection
// =============================================================================

export interface FencedBlock {
  content: string;
  language: string;
  fenceStart: number;
  contentStart: number;
  fenceEnd: number;
  isComplete: boolean;
}

const FENCE_OPEN_RE = /```(\w*)\s*\n?/g;

/**
 * Scan `text` for all triple-backtick fenced blocks. Returns them in
 * document order. Incomplete blocks (no closing fence) are included
 * with `isComplete: false` and content running to end-of-string.
 */
export function findAllFencedBlocks(text: string): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  FENCE_OPEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FENCE_OPEN_RE.exec(text)) !== null) {
    const language = (match[1] || "").toLowerCase();
    const fenceStart = match.index;
    const contentStart = fenceStart + match[0].length;

    const closeIndex = findClosingFence(text, contentStart);

    if (closeIndex !== -1) {
      blocks.push({
        content: text.slice(contentStart, closeIndex),
        language,
        fenceStart,
        contentStart,
        fenceEnd: closeIndex + 3,
        isComplete: true,
      });
      FENCE_OPEN_RE.lastIndex = closeIndex + 3;
    } else {
      blocks.push({
        content: text.slice(contentStart),
        language,
        fenceStart,
        contentStart,
        fenceEnd: text.length,
        isComplete: false,
      });
      break;
    }
  }

  return blocks;
}

/**
 * Find the closing ``` for a fenced block, starting search from `from`.
 * Skips nested fenced blocks if any appear (rare, but defensive).
 */
function findClosingFence(text: string, from: number): number {
  let i = from;
  while (i < text.length) {
    const idx = text.indexOf("```", i);
    if (idx === -1) return -1;

    const lineStart = text.lastIndexOf("\n", idx - 1) + 1;
    const prefix = text.slice(lineStart, idx).trim();
    if (prefix === "") {
      return idx;
    }

    i = idx + 3;
  }
  return -1;
}

// =============================================================================
// Bare JSON Scanning
// =============================================================================

export interface BareJsonCandidate {
  startIndex: number;
  endIndex: number;
  openChar: "{" | "[";
  isComplete: boolean;
}

/**
 * Scan `text` for top-level `{` or `[` characters that are NOT inside
 * a fenced block. Returns all candidates with balanced-end info.
 *
 * `excludeRanges` is an array of [start, end) index pairs to skip
 * (typically the ranges covered by fenced blocks).
 */
export function findBareJsonCandidates(
  text: string,
  excludeRanges: Array<[number, number]> = [],
): BareJsonCandidate[] {
  const candidates: BareJsonCandidate[] = [];
  let inString = false;
  let escapeNext = false;

  const isExcluded = (idx: number): boolean =>
    excludeRanges.some(([s, e]) => idx >= s && idx < e);

  for (let i = 0; i < text.length; i++) {
    if (isExcluded(i)) continue;

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
      continue;
    }

    if (inString) continue;

    if (ch === "{" || ch === "[") {
      const closeChar = ch === "{" ? "}" : "]";
      const result = findBalancedEnd(text, i, ch, closeChar);
      candidates.push({
        startIndex: i,
        endIndex: result.endIndex,
        openChar: ch,
        isComplete: result.isComplete,
      });
      if (result.isComplete) {
        i = result.endIndex;
      } else {
        break;
      }
    }
  }

  return candidates;
}
