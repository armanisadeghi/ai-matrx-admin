"use client";

/**
 * useSmartCodeEditor — the brain.
 *
 * Agent-system replacement for useAICodeEditor. Manages the AI edit cycle:
 * input → processing → review → applying → complete / error.
 *
 * Contract:
 *   - Caller passes `conversationId` (created by SmartCodeEditorModal's
 *     launch step) + `currentCode` + `onCodeChange`.
 *   - Hook subscribes to agent-system selectors: messages, latest request id,
 *     request status, accumulated streaming text, executing flag.
 *   - When a request transitions `streaming → complete`, hook parses the
 *     final response for SEARCH/REPLACE blocks. If found and valid, it
 *     applies them to a staged `modifiedCode` and moves state → review.
 *   - If the agent used widget_text_* tool calls instead, the editor's
 *     `code` prop will already reflect those mutations (via the widget
 *     handle). In that case, stream completion lands in state='input' with
 *     no parsed edits.
 *
 * This hook is intentionally stream-native: unlike the prompt system, no
 * explicit `completeExecutionThunk` is dispatched — the stream processor
 * auto-commits and the hook watches the request status to detect it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAccumulatedText,
  selectRequestStatus,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import {
  selectIsExecuting,
  selectLatestRequestId,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectConversationMessages } from "@/features/agents/redux/execution-system/messages/messages.selectors";
import type { MessageRecord } from "@/features/agents/redux/execution-system/messages/messages.slice";
import {
  parseCodeEdits,
  validateEdits,
  type ParseResult,
} from "../utils/parseCodeEdits";
import { applyCodeEdits } from "../utils/applyCodeEdits";
import { getDiffStats } from "../utils/generateDiff";
import type { CodeEditorState, UseSmartCodeEditorReturn } from "../types";

interface UseSmartCodeEditorArgs {
  /** The conversationId the modal created for this session. */
  conversationId: string | null | undefined;
  /** Current editor code — the baseline we parse/validate edits against. */
  currentCode: string;
  /** Callback that writes new code back to the parent on Apply. */
  onCodeChange: (newCode: string) => void;
}

export function useSmartCodeEditor({
  conversationId,
  currentCode,
  onCodeChange,
}: UseSmartCodeEditorArgs): UseSmartCodeEditorReturn & {
  messages: MessageRecord[];
  streamingText: string;
  setState: (s: CodeEditorState) => void;
} {
  const [state, setState] = useState<CodeEditorState>("input");
  const [parsedEdits, setParsedEdits] = useState<ParseResult | null>(null);
  const [modifiedCode, setModifiedCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [rawAIResponse, setRawAIResponse] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);

  // Agent-system selectors — note: selectLatestRequestId returns undefined
  // until the first turn fires, so requestId will be undefined at mount.
  const safeConversationId = conversationId ?? "__none__";

  const messages = useAppSelector(
    selectConversationMessages(safeConversationId),
  );
  const isExecuting = useAppSelector(selectIsExecuting(safeConversationId));
  const requestId = useAppSelector(selectLatestRequestId(safeConversationId));
  const requestStatus = useAppSelector(
    requestId ? selectRequestStatus(requestId) : () => undefined,
  );
  const streamingText = useAppSelector(
    requestId ? selectAccumulatedText(requestId) : () => "",
  );

  // Keep latest-values refs for effects that shouldn't re-fire on every
  // streaming token (those effects want to read final values at stream end).
  const streamingTextRef = useRef(streamingText);
  streamingTextRef.current = streamingText;
  const currentCodeRef = useRef(currentCode);
  currentCodeRef.current = currentCode;

  // ── State machine: input → processing
  // The moment isExecuting flips true we transition UI to processing.
  // When isExecuting flips false AND the request completed, run the
  // post-stream parse and transition to review/error/input.
  useEffect(() => {
    if (isExecuting && state !== "processing") {
      setState("processing");
    }
  }, [isExecuting, state]);

  // ── State machine: processing → review|error|input (on stream end)
  useEffect(() => {
    if (state !== "processing") return;
    if (isExecuting) return;
    if (requestStatus !== "complete" && requestStatus !== "error") return;

    const finalText = streamingTextRef.current;
    setRawAIResponse(finalText);

    if (requestStatus === "error") {
      setState("error");
      setErrorMessage(
        "The agent reported an error during this turn. Inspect the raw response below for details.",
      );
      return;
    }

    // Parse SEARCH/REPLACE blocks out of the final response text. If the
    // agent delivered its edits via widget_text_* tool calls instead, the
    // parser will find nothing — that's fine; widget tool calls already
    // mutated the editor's code live via the widget handle.
    const parsed = parseCodeEdits(finalText);
    setParsedEdits(parsed);

    if (!parsed.success || parsed.edits.length === 0) {
      // No fallback edits — agent either used widget tools or just chatted.
      // Drop back to input so the user can continue the conversation.
      setState("input");
      return;
    }

    const validation = validateEdits(currentCodeRef.current, parsed.edits);

    if (!validation.valid) {
      let msg = `⚠️ INVALID CODE EDITS\n\n`;
      msg += `The AI provided ${parsed.edits.length} edit${parsed.edits.length !== 1 ? "s" : ""}, but some SEARCH patterns don't match the current code.\n\n`;
      msg += `This usually means the AI is trying to edit code that doesn't exist or has changed.\n`;
      msg += `You can continue the conversation to clarify or try again.\n\n`;
      if (validation.warnings.length > 0) {
        msg += `✓ ${validation.warnings.length} edit${validation.warnings.length !== 1 ? "s" : ""} will use fuzzy matching (whitespace-tolerant)\n`;
      }
      msg += `✗ ${validation.errors.length} edit${validation.errors.length !== 1 ? "s" : ""} failed validation\n\n`;
      msg += `${"═".repeat(70)}\n`;
      validation.errors.forEach((err) => {
        msg += err;
        msg += `\n`;
      });
      setErrorMessage(msg);
      setState("error");
      return;
    }

    const result = applyCodeEdits(currentCodeRef.current, parsed.edits);
    if (!result.success) {
      let msg = `Error Applying Edits:\n\n`;
      result.errors.forEach((err, i) => {
        msg += `${i + 1}. ${err}\n`;
      });
      setErrorMessage(msg);
      setState("error");
      return;
    }

    setModifiedCode(result.code || "");
    setState("review");
  }, [state, isExecuting, requestStatus]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleApplyChanges = useCallback(async () => {
    setState("applying");
    // Give the UI a frame to render the applying state.
    await new Promise((resolve) => setTimeout(resolve, 200));
    onCodeChange(modifiedCode);
    setState("complete");
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Reset to input so the user can keep iterating.
    setModifiedCode("");
    setParsedEdits(null);
    setRawAIResponse("");
    setErrorMessage("");
    setState("input");
  }, [modifiedCode, onCodeChange]);

  const handleCopyResponse = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawAIResponse);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }, [rawAIResponse]);

  const handleRejectEdits = useCallback(() => {
    setParsedEdits(null);
    setModifiedCode("");
    setRawAIResponse("");
    setErrorMessage("");
    setState("input");
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────

  const diffStats = useMemo(() => {
    if (!modifiedCode) return null;
    return getDiffStats(currentCode, modifiedCode);
  }, [currentCode, modifiedCode]);

  return {
    state,
    setState,
    parsedEdits,
    modifiedCode,
    errorMessage,
    rawAIResponse,
    isExecuting,
    isCopied,
    diffStats,
    requestId: requestId ?? null,
    handleApplyChanges,
    handleCopyResponse,
    handleRejectEdits,
    messages,
    streamingText,
  };
}
