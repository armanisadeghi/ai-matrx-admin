"use client";

// usePreviewFindHighlight — Highlight find matches inside rendered markdown
// preview using the CSS Custom Highlight API.
//
// The preview pane renders arbitrary HTML (headings, code blocks, lists, etc.)
// so we can't rely on character offsets from the plain-text source: those
// indices don't line up with the rendered DOM. Instead we re-run the search
// against the visible text nodes and build Ranges over the matching text.
//
// CSS.highlights is widely supported in modern browsers; in older engines
// (or during SSR) we silently no-op — highlights are a nice-to-have, search
// still works in the textarea side.

import { useEffect } from "react";
import type { FindMatch } from "../utils/findMatches";

type HighlightRegistry = Map<string, Highlight>;

function getHighlights(): HighlightRegistry | null {
  if (typeof CSS === "undefined") return null;
  const g = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
  return g ?? null;
}

interface Options {
  /** The container holding the rendered markdown (preview root). */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Current find query — we re-run the search against visible text nodes. */
  query: string;
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
  /** Index of the active match among the computed source matches. */
  activeIndex: number;
  /** Total match count from source (only used to detect active validity). */
  matchCount: number;
  /** When this changes we re-scroll the active match into view. */
  scrollToken: number;
  /** Whether find is open — if not, we clear highlights. */
  enabled: boolean;
}

function buildRegex(
  query: string,
  caseSensitive: boolean,
  useRegex: boolean,
  wholeWord: boolean,
): RegExp | null {
  if (!query) return null;
  let pattern: string;
  if (useRegex) {
    try {
      new RegExp(query);
      pattern = query;
    } catch {
      return null;
    }
  } else {
    pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (wholeWord) pattern = `\\b${pattern}\\b`;
  try {
    return new RegExp(pattern, caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

export function usePreviewFindHighlight({
  containerRef,
  query,
  caseSensitive,
  useRegex,
  wholeWord,
  activeIndex,
  matchCount,
  scrollToken,
  enabled,
}: Options) {
  useEffect(() => {
    const highlights = getHighlights();
    if (!highlights) return;
    const container = containerRef.current;

    // Clear any previous highlights — we'll re-register below if still enabled.
    highlights.delete("notes-find-match");
    highlights.delete("notes-find-match-active");

    if (!enabled || !container || !query) return;

    const regex = buildRegex(query, caseSensitive, useRegex, wholeWord);
    if (!regex) return;

    // Walk every visible text node, running the regex and collecting ranges.
    // We reset lastIndex for each node because the regex is in exec loop mode.
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    );

    const allRanges: Range[] = [];
    let node: Node | null = walker.nextNode();
    // Safety cap — pathological docs shouldn't hang the browser.
    let rangeBudget = 20_000;

    while (node && rangeBudget > 0) {
      const text = node.nodeValue ?? "";
      if (text.length > 0) {
        regex.lastIndex = 0;
        let m: RegExpExecArray | null;
        let iterCap = 10_000;
        while ((m = regex.exec(text)) !== null && iterCap-- > 0) {
          if (m[0].length === 0) {
            regex.lastIndex++;
            continue;
          }
          const range = document.createRange();
          try {
            range.setStart(node, m.index);
            range.setEnd(node, m.index + m[0].length);
            allRanges.push(range);
            rangeBudget--;
          } catch {
            // Bad offset — skip this match and move on.
          }
        }
      }
      node = walker.nextNode();
    }

    if (allRanges.length === 0) return;

    // If the active index from the source (plain-text) is out of range for
    // the preview matches, fall back to marking every range as non-active.
    const activeRange =
      activeIndex >= 0 && activeIndex < allRanges.length
        ? allRanges[activeIndex]
        : null;

    const nonActive = activeRange
      ? allRanges.filter((r) => r !== activeRange)
      : allRanges;

    if (nonActive.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlights.set("notes-find-match", new (window as any).Highlight(...nonActive));
    }
    if (activeRange) {
      highlights.set(
        "notes-find-match-active",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).Highlight(activeRange),
      );
    }

    // Scroll-into-view for the active match in the preview. Uses the range's
    // bounding rect, which works regardless of the scrollable ancestor.
    if (activeRange) {
      const rect = activeRange.getBoundingClientRect();
      // Find a scrollable ancestor (container or first scroll parent).
      let el: HTMLElement | null = container;
      while (el && el !== document.body) {
        const overflowY = window.getComputedStyle(el).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") break;
        el = el.parentElement;
      }
      if (el) {
        const ancRect = el.getBoundingClientRect();
        const pad = 40;
        if (rect.top < ancRect.top + pad) {
          el.scrollTop += rect.top - ancRect.top - pad;
        } else if (rect.bottom > ancRect.bottom - pad) {
          el.scrollTop += rect.bottom - ancRect.bottom + pad;
        }
      }
    }

    // Cleanup on unmount / next run.
    return () => {
      const h = getHighlights();
      if (!h) return;
      h.delete("notes-find-match");
      h.delete("notes-find-match-active");
    };
  }, [
    containerRef,
    query,
    caseSensitive,
    useRegex,
    wholeWord,
    activeIndex,
    matchCount,
    scrollToken,
    enabled,
  ]);
}
