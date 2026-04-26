"use client";

import { useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useApiAuth } from "@/hooks/useApiAuth";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { ENDPOINTS, BACKEND_URLS } from "@/lib/api/endpoints";
import { consumeStream } from "@/lib/api/stream-parser";
import type { RootState } from "@/lib/redux/store.types";
import { extractErrorMessage } from "@/utils/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecuteParams {
  agentId: string;
  variables: Record<string, string>;
  userInput?: string;
}

interface UseToolComponentAgentReturn {
  execute: (params: ExecuteParams) => Promise<string | null>;
  cancel: () => void;
  isStreaming: boolean;
  accumulatedText: string;
  error: string | null;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Lightweight agent execution hook for the Tool UI Component Generator.
 *
 * Bypasses ChatContext entirely — uses simple local state for streaming.
 * Streams from POST /ai/prompts/{promptId} via NDJSON, accumulates chunks,
 * and returns the full text on completion.
 *
 * Pattern mirrors useAgentChat but without any message management or context deps.
 */
export function useToolComponentAgent(): UseToolComponentAgentReturn {
  const { getHeaders, waitForAuth } = useApiAuth();
  const resolvedBaseUrl = useSelector((state: RootState) =>
    selectResolvedBaseUrl(state as any),
  );

  const [isStreaming, setIsStreaming] = useState(false);
  const [accumulatedText, setAccumulatedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef("");

  const getBackendUrl = useCallback(() => {
    return resolvedBaseUrl ?? BACKEND_URLS.production;
  }, [resolvedBaseUrl]);

  const reset = useCallback(() => {
    setAccumulatedText("");
    setError(null);
    accumulatedRef.current = "";
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const execute = useCallback(
    async ({
      agentId,
      variables,
      userInput,
    }: ExecuteParams): Promise<string | null> => {
      const authReady = await waitForAuth();
      if (!authReady) {
        setError("Unable to verify access. Please refresh the page.");
        return null;
      }

      // Reset state
      accumulatedRef.current = "";
      setAccumulatedText("");
      setError(null);
      setIsStreaming(true);

      abortControllerRef.current = new AbortController();

      try {
        const BACKEND_URL = getBackendUrl();
        const headers = getHeaders();
        const executeUrl = `${BACKEND_URL}${ENDPOINTS.ai.promptStart(agentId)}`;

        const response = await fetch(executeUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_input: userInput?.trim() || "Generate the component now.",
            variables,
            stream: true,
            debug: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg =
              errData?.error?.user_message ||
              errData?.error?.message ||
              errData?.user_message ||
              errData?.error ||
              errData?.message ||
              errorMsg;
          } catch {
            // use default
          }
          throw new Error(extractErrorMessage(errorMsg));
        }

        if (!response.body) throw new Error("No response body from Agent API");

        const { accumulatedText: finalText } = await consumeStream(
          response,
          {
            onChunk: (chunk) => {
              if (chunk.text) {
                accumulatedRef.current += chunk.text;
                setAccumulatedText(accumulatedRef.current);
              }
            },
            onError: (err) => {
              const message = err.user_message || err.message || "Stream error";
              setError(String(message));
            },
          },
          abortControllerRef.current.signal,
        );

        return finalText || accumulatedRef.current;
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name === "AbortError") {
          setError("Generation cancelled.");
        } else {
          setError(e.message || "Unknown error during generation");
        }
        return null;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [getBackendUrl, getHeaders, waitForAuth],
  );

  return { execute, cancel, isStreaming, accumulatedText, error, reset };
}
