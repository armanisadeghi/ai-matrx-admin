"use client";

import { useState, useCallback, useRef } from "react";
import { consumeStream } from "@/lib/api/stream-parser";
import type {
  PhasePayload,
  EndPayload,
  CompletionPayload,
  ToolEventPayload,
  InfoPayload,
} from "@/lib/api/types";
import type { TypedStreamEvent } from "@/types/python-generated/stream-events";
import type {
  ResearchStreamStep,
  ResearchDataEvent,
  ResearchInfoEvent,
  ResearchStreamCallbacks,
} from "../types";

export interface StreamMessage {
  id: string;
  timestamp: number;
  status: ResearchStreamStep;
  message: string;
}

export interface UseResearchStreamReturn {
  isStreaming: boolean;
  streamingText: string;
  messages: StreamMessage[];
  currentStep: ResearchStreamStep | null;
  error: string | null;
  rawEvents: TypedStreamEvent[];
  infos: ResearchInfoEvent[];
  startStream: (
    response: Response,
    callbacks?: ResearchStreamCallbacks,
  ) => Promise<void>;
  cancel: () => void;
  clearMessages: () => void;
}

/**
 * Core streaming hook for all research operations.
 *
 * Page load: DB snapshot populates state.
 * After that: every domain object arrives via `data` events and is merged
 * into local state immediately — no DB refetch needed.
 *
 * Pass per-call callbacks to `startStream` for domain-specific handling.
 * The hook handles progress messages and error state automatically.
 */
export function useResearchStream(
  onComplete?: () => void,
): UseResearchStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<ResearchStreamStep | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [rawEvents, setRawEvents] = useState<TypedStreamEvent[]>([]);
  const [infos, setInfos] = useState<ResearchInfoEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const idCounter = useRef(0);

  const addMessage = useCallback(
    (status: ResearchStreamStep, message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${++idCounter.current}`,
          timestamp: Date.now(),
          status,
          message,
        },
      ]);
    },
    [],
  );

  const startStream = useCallback(
    async (response: Response, callbacks?: ResearchStreamCallbacks) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setError(null);
      setMessages([]);
      setCurrentStep(null);
      setStreamingText("");
      setRawEvents([]);
      setInfos([]);

      try {
        await consumeStream(
          response,
          {
            onEvent: (event: TypedStreamEvent) => {
              setRawEvents((prev) => [...prev, event]);
              const handled = [
                "chunk",
                "phase",
                "data",
                "completion",
                "tool_event",
                "error",
                "heartbeat",
                "end",
              ];
              const handledWithInfo = [...handled, "info"];
              if (!handledWithInfo.includes(event.event)) {
                callbacks?.onUnknownEvent?.(
                  event as { event: string; data: unknown },
                );
              }
            },

            onChunk: (data) => {
              setStreamingText((prev) => prev + data.text);
              callbacks?.onChunk?.(data.text);
            },

            onPhase: (data: PhasePayload) => {
              const step = (data.phase as ResearchStreamStep) || "searching";
              setCurrentStep(step);
              addMessage(step, data.phase);
              callbacks?.onStatusUpdate?.(step, data.phase);
            },

            onData: (data) => {
              const record = data as unknown as Record<string, unknown>;
              if (record.event && typeof record.event === "string") {
                callbacks?.onData?.(record as unknown as ResearchDataEvent);
              }
            },

            onInfo: (data: InfoPayload) => {
              const info: ResearchInfoEvent = {
                code: data.code,
                message:
                  data.user_message ?? data.system_message ?? data.code,
                user_message: data.user_message,
                metadata: data.metadata,
              };
              setInfos((prev) => [...prev, info]);
              callbacks?.onInfo?.(info);
            },

            onCompletion: (data: CompletionPayload) => {
              callbacks?.onCompletion?.(
                data as unknown as Record<string, unknown>,
              );
            },

            onToolEvent: (data: ToolEventPayload) => {
              callbacks?.onToolEvent?.(
                data as unknown as Record<string, unknown>,
              );
            },

            onError: (err) => {
              const msg =
                err.user_message ?? err.message ?? "An error occurred";
              setError(msg);
              setCurrentStep("error");
              callbacks?.onError?.(msg);
            },

            onEnd: (_data: EndPayload) => {
              setCurrentStep("complete");
              callbacks?.onEnd?.();
              onComplete?.();
            },
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const msg = (err as Error).message;
          setError(msg);
          setCurrentStep("error");
          callbacks?.onError?.(msg);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [addMessage, onComplete],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setCurrentStep(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStep(null);
    setError(null);
    setStreamingText("");
    setRawEvents([]);
    setInfos([]);
  }, []);

  return {
    isStreaming,
    streamingText,
    messages,
    currentStep,
    error,
    rawEvents,
    infos,
    startStream,
    cancel,
    clearMessages,
  };
}
