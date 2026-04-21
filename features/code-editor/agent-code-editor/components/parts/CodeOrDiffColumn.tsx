"use client";

/**
 * CodeOrDiffColumn — the right-of-center column.
 *
 * Renders the code editor by default. When the smart-code-editor state
 * machine transitions to `review`, the diff replaces the code IN PLACE
 * (same column, same real estate). Apply/Discard buttons sit at the bottom.
 *
 * Intentionally simple — the textarea is fine for the first draft; Monaco
 * can come later.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { DiffView } from "./DiffView";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { ErrorPanel } from "./ErrorPanel";
import type { CodeEditorState } from "../../types";
import type { ParseResult } from "../../utils/parseCodeEdits";

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
  streamingText: string;

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
  streamingText,
  onApply,
  onDiscard,
  onCopyResponse,
  onBackToInput,
}: CodeOrDiffColumnProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header bar */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {state === "review" ? "Review Changes" : "Code"}
        </span>
        {state === "review" && diffStats && (
          <div className="flex gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30"
            >
              +{diffStats.additions}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30"
            >
              -{diffStats.deletions}
            </Badge>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Always-mounted editor so typing state is never destroyed when state
            flips to review — review simply overlays in the same column. */}
        <div
          className={
            state === "review" ||
            state === "applying" ||
            state === "complete" ||
            state === "error"
              ? "hidden"
              : "h-full flex flex-col"
          }
        >
          <Textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="flex-1 resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Paste or write code here…"
            spellCheck={false}
          />
          {state === "processing" && (
            <ProcessingOverlay streamingText={streamingText} />
          )}
        </div>

        {state === "review" && parsedEdits && (
          <div className="h-full flex flex-col">
            {parsedEdits.explanation && (
              <Alert className="shrink-0 mx-2 mt-2 py-2">
                <AlertDescription className="text-xs">
                  {parsedEdits.explanation}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex-1 min-h-0 overflow-auto">
              <DiffView
                originalCode={code}
                modifiedCode={modifiedCode}
                language={language}
                showLineNumbers
              />
            </div>
          </div>
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

      {/* Footer — action bar depends on state */}
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
            Agent is thinking…
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {code.length} chars · {code.split("\n").length} lines
          </span>
        )}
        {state === "error" && (
          <span className="mr-auto flex items-center gap-1 text-[10px] text-destructive">
            <AlertCircle className="w-3 h-3" />
            Agent reported an error
          </span>
        )}
      </div>
    </div>
  );
}
