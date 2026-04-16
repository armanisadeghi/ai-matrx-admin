// features/notes/utils/findMatches.ts
// Pure match engine for Find & Replace — no React dependencies, fully testable.

export interface FindMatch {
  start: number;
  end: number;
}

export interface FindOptions {
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
}

/**
 * Build a RegExp from a query string + options.
 * Returns null if the query is empty or an invalid regex.
 */
function buildPattern(query: string, options: FindOptions): RegExp | null {
  if (!query) return null;

  let pattern: string;
  if (options.useRegex) {
    try {
      // Validate the regex
      new RegExp(query);
      pattern = query;
    } catch {
      return null; // Invalid regex — caller should show error state
    }
  } else {
    // Escape regex special characters for literal matching
    pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const flags = options.caseSensitive ? "g" : "gi";
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * Find all matches of a query in content.
 * Returns an array of { start, end } positions sorted by start.
 */
export function computeMatches(
  content: string,
  query: string,
  options: FindOptions,
): FindMatch[] {
  const regex = buildPattern(query, options);
  if (!regex) return [];

  const matches: FindMatch[] = [];
  let match: RegExpExecArray | null;

  // Safety: limit iterations to prevent catastrophic backtracking on pathological regex
  let limit = 100_000;
  while ((match = regex.exec(content)) !== null && limit-- > 0) {
    if (match[0].length === 0) {
      // Zero-length match — advance to avoid infinite loop
      regex.lastIndex++;
      continue;
    }
    matches.push({ start: match.index, end: match.index + match[0].length });
  }

  return matches;
}

/**
 * Replace a single match at `targetIndex`, or all matches if `targetIndex` is undefined.
 * Returns the new content string.
 */
export function applyReplace(
  content: string,
  matches: FindMatch[],
  replaceText: string,
  targetIndex?: number,
): string {
  if (matches.length === 0) return content;

  // Replace specific match
  if (targetIndex !== undefined) {
    const m = matches[targetIndex];
    if (!m) return content;
    return content.slice(0, m.start) + replaceText + content.slice(m.end);
  }

  // Replace all — iterate from end to preserve earlier positions
  let result = content;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    result = result.slice(0, m.start) + replaceText + result.slice(m.end);
  }
  return result;
}
