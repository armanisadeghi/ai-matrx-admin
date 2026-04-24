"use client";

// FindReplaceBar — Inline VSCode-style find & replace bar.
// Positioned at top of editor area. Receives the textarea ref + preview
// container ref for scroll-into-view and match highlighting.
//
// Focus rules:
//   - Typing in the find input NEVER moves focus to the textarea. We don't
//     touch textarea.focus() during `setQuery` — so cursor position and
//     input composition are preserved.
//   - Navigation (next / prev / Enter / Shift+Enter) scrolls the active
//     match into view but also does NOT move focus. Scrolling is done by
//     setting textarea.scrollTop directly, computed from the mirror overlay.
//   - Only explicit close / replace flushes focus back to the textarea.
//
// Highlighting:
//   - All matches get a yellow background via <FindMatchOverlay> (mirror div).
//   - The active match gets an orange highlight.
//   - In split / preview modes the markdown preview pane uses the CSS
//     Custom Highlight API (see usePreviewFindHighlight) to paint matches
//     directly on the rendered HTML.

import React, { useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  X,
  CaseSensitive,
  Regex,
  WholeWord,
  Replace,
  ReplaceAll,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotesInstanceId } from "../context/NotesInstanceContext";
import { useFindReplace } from "../hooks/useFindReplace";

interface FindReplaceBarProps {
  noteId: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function FindReplaceBar({ noteId, textareaRef }: FindReplaceBarProps) {
  const instanceId = useNotesInstanceId();
  const fr = useFindReplace(instanceId, noteId);
  const findInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-focus find input on mount ────────────────────────────────
  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  // ── Sync native selection with the active match ───────────────────
  // We still want the textarea's native selection to track the active
  // match so "replace" / "replace all" and user keyboard shortcuts can
  // act on it. But we deliberately DO NOT call focus() — we just update
  // the selection range while the textarea is unfocused. Browsers keep
  // the selection persisted across focus events, so a later focus()
  // restores the highlight without us needing to steal it now.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (fr.matches.length === 0 || fr.currentMatchIndex < 0) return;
    const match = fr.matches[fr.currentMatchIndex];
    if (!match) return;
    // Skip if the textarea itself is currently focused — in that case
    // the user is editing and we shouldn't yank their caret around.
    if (document.activeElement === ta) return;
    try {
      ta.setSelectionRange(match.start, match.end);
    } catch {
      // Ignore — can happen if the textarea was unmounted mid-flight.
    }
  }, [textareaRef, fr.matches, fr.currentMatchIndex]);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  const handleFindKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) fr.prev();
        else fr.next();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        fr.close();
        textareaRef.current?.focus();
      }
    },
    [fr, textareaRef],
  );

  const handleReplaceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) fr.replaceAll();
        else fr.replaceOne();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        fr.close();
        textareaRef.current?.focus();
      }
    },
    [fr, textareaRef],
  );

  // After replace we want focus back in the find input so the user can
  // keep pressing Enter to step through / replace. Without this, focus
  // would shift to the button that was clicked.
  const refocusFind = useCallback(() => {
    requestAnimationFrame(() => findInputRef.current?.focus());
  }, []);

  const handleNext = useCallback(() => {
    fr.next();
    refocusFind();
  }, [fr, refocusFind]);

  const handlePrev = useCallback(() => {
    fr.prev();
    refocusFind();
  }, [fr, refocusFind]);

  const handleReplaceOne = useCallback(() => {
    fr.replaceOne();
    refocusFind();
  }, [fr, refocusFind]);

  const handleReplaceAll = useCallback(() => {
    fr.replaceAll();
    refocusFind();
  }, [fr, refocusFind]);

  if (!fr.isOpen) return null;

  const toggleBtnClass = (active: boolean) =>
    cn(
      "flex items-center justify-center w-6 h-6 rounded transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5",
      active
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted",
    );

  const actionBtnClass =
    "flex items-center justify-center w-6 h-6 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted [&_svg]:w-3.5 [&_svg]:h-3.5 disabled:opacity-30 disabled:pointer-events-none";

  const matchCounter =
    fr.matchCount > 0
      ? `${fr.currentMatchIndex + 1}/${fr.matchCount}`
      : fr.query
        ? "No results"
        : "";

  return (
    <div className="flex flex-col gap-1 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
      {/* ── Row 1: Find ── */}
      <div className="flex items-center gap-1">
        {/* Toggle replace expand */}
        <button
          className={cn(actionBtnClass, "mr-0.5")}
          onClick={fr.toggleReplace}
          title={fr.showReplace ? "Hide replace" : "Show replace"}
        >
          <ChevronRight
            className={cn("transition-transform", fr.showReplace && "rotate-90")}
          />
        </button>

        {/* Find input */}
        <div className="flex-1 flex items-center gap-1 bg-background border border-border rounded px-2 min-w-0">
          <input
            ref={findInputRef}
            type="text"
            value={fr.query}
            onChange={(e) => fr.setQuery(e.target.value)}
            onKeyDown={handleFindKeyDown}
            placeholder="Find"
            className="flex-1 bg-transparent text-sm py-1 outline-none min-w-0 placeholder:text-muted-foreground/50"
            spellCheck={false}
          />
          {/* Option toggles */}
          <button
            className={toggleBtnClass(fr.caseSensitive)}
            onClick={() => {
              fr.toggle("caseSensitive");
              refocusFind();
            }}
            title="Match Case"
          >
            <CaseSensitive />
          </button>
          <button
            className={toggleBtnClass(fr.wholeWord)}
            onClick={() => {
              fr.toggle("wholeWord");
              refocusFind();
            }}
            title="Whole Word"
          >
            <WholeWord />
          </button>
          <button
            className={toggleBtnClass(fr.useRegex)}
            onClick={() => {
              fr.toggle("useRegex");
              refocusFind();
            }}
            title="Use Regular Expression"
          >
            <Regex />
          </button>
        </div>

        {/* Match counter */}
        <span className="text-xs text-muted-foreground w-16 text-center shrink-0 tabular-nums">
          {matchCounter}
        </span>

        {/* Nav buttons */}
        <button
          className={actionBtnClass}
          onClick={handlePrev}
          disabled={fr.matchCount === 0}
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp />
        </button>
        <button
          className={actionBtnClass}
          onClick={handleNext}
          disabled={fr.matchCount === 0}
          title="Next Match (Enter)"
        >
          <ChevronDown />
        </button>

        {/* Close */}
        <button
          className={actionBtnClass}
          onClick={() => {
            fr.close();
            textareaRef.current?.focus();
          }}
          title="Close (Escape)"
        >
          <X />
        </button>
      </div>

      {/* ── Row 2: Replace (collapsible) ── */}
      {fr.showReplace && (
        <div className="flex items-center gap-1 pl-7">
          <div className="flex-1 flex items-center bg-background border border-border rounded px-2 min-w-0">
            <input
              type="text"
              value={fr.replaceText}
              onChange={(e) => fr.setReplaceText(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              placeholder="Replace"
              className="flex-1 bg-transparent text-sm py-1 outline-none min-w-0 placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>

          {/* Replace one */}
          <button
            className={actionBtnClass}
            onClick={handleReplaceOne}
            disabled={fr.matchCount === 0}
            title="Replace (Enter)"
          >
            <Replace />
          </button>

          {/* Replace all */}
          <button
            className={actionBtnClass}
            onClick={handleReplaceAll}
            disabled={fr.matchCount === 0}
            title="Replace All (Shift+Enter)"
          >
            <ReplaceAll />
          </button>

          {/* Spacer to align with close button above */}
          <div className="w-6 shrink-0" />
        </div>
      )}
    </div>
  );
}
