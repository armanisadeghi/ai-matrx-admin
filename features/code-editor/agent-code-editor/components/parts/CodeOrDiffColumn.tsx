"use client";

/**
 * CodeOrDiffColumn — the code column (middle-right in the 4-column layout).
 *
 * Two modes, in-place (no modal):
 *   - Default: Monaco editor, stable through streaming (no live widget
 *     mutations — those are buffered and applied on Apply).
 *   - Review: full `<ReviewStage>` with Diff / Original / Preview / Response
 *     tabs + diff-stat badges, replacing the editor in the same real estate.
 *
 * A thin status line at the top shows "Agent working…" during streaming;
 * we do NOT re-stream response text here — the conversation column already
 * shows that.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { ReviewStage } from "./ReviewStage";
import { ErrorPanel } from "./ErrorPanel";
import type { CodeEditorState } from "../../types";
import type { ParseResult } from "../../utils/parseCodeEdits";

// Monaco imports are heavy; dynamic-load client-only.
const SmallCodeEditor = dynamic(
  () =>
    import(
      "@/features/code-editor/components/code-block/SmallCodeEditor"
    ).then((m) => m.default),
  { ssr: false },
);

interface CodeOrDiffColumnProps {
  /** Current editor code. */
  code: string;
  onCodeChange: (next: string) => void;
  language: string;

  // State machine controls (from useSmartCodeEditor)
  state: CodeEditorState;
  parsedEdits: ParseResult | null;
  modifiedCode: string;
  rawAIResponse: string;
  errorMessage: string;
  isCopied: boolean;
  diffStats: { additions: number; deletions: number } | null;

  onApply: () => void | Promise<void>;
  onDiscard: () => void;
  onCopyResponse: () => void | Promise<void>;
  onBackToInput: () => void;
}

export function CodeOrDiffColumn({
  code,
  onCodeChange,
  language,
  state,
  parsedEdits,
  modifiedCode,
  rawAIResponse,
  errorMessage,
  isCopied,
  diffStats,
  onApply,
  onDiscard,
  onCopyResponse,
  onBackToInput,
}: CodeOrDiffColumnProps) {
  const mode = useAppSelector((s) => s.theme.mode);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Thin status strip on top */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {state === "review" ? "Review Changes" : "Code"}
        </span>
        {state === "processing" && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Agent working…
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Editor — always mounted while NOT reviewing / applying / error, so
            user edits aren't lost when state flips. */}
        {(state === "input" || state === "processing") && (
          <div className="h-full w-full">
            <SmallCodeEditor
              language={language}
              initialCode={code}
              onChange={(val) => onCodeChange(val ?? "")}
              mode={mode}
              height="100%"
              readOnly={state === "processing"}
              defaultWordWrap="on"
              showFormatButton={false}
              showCopyButton={false}
              showResetButton={false}
              showWordWrapToggle={false}
              showMinimapToggle={false}
            />
          </div>
        )}

        {state === "review" && parsedEdits && (
          <ReviewStage
            currentCode={code}
            modifiedCode={modifiedCode}
            language={language}
            parsedEdits={parsedEdits}
            rawAIResponse={rawAIResponse}
            diffStats={diffStats}
          />
        )}

        {state === "applying" && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">Applying changes…</p>
            </div>
          </div>
        )}

        {state === "complete" && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium">Changes applied</p>
            </div>
          </div>
        )}

        {state === "error" && (
          <ErrorPanel
            errorMessage={errorMessage}
            rawAIResponse={rawAIResponse}
            isCopied={isCopied}
            onCopyResponse={onCopyResponse}
          />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-2 py-2 flex items-center justify-end gap-1.5 bg-background">
        {state === "review" ? (
          <>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              Discard
            </Button>
            <Button
              size="sm"
              onClick={onApply}
              className="bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply
            </Button>
          </>
        ) : state === "error" ? (
          <Button size="sm" onClick={onBackToInput}>
            Back
          </Button>
        ) : state === "processing" ? (
          <span className="text-[10px] text-muted-foreground italic">
            {code.length} chars · {code.split("\n").length} lines
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {code.length} chars · {code.split("\n").length} lines
          </span>
        )}
      </div>
    </div>
  );
}
