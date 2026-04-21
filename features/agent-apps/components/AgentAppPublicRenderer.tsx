"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import { transform } from "@babel/standalone";
import { AlertCircle, Copy, Check, MoreHorizontal } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useGuestLimit } from "@/hooks/useGuestLimit";
import { GuestLimitWarning } from "@/components/guest/GuestLimitWarning";
import { SignupConversionModal } from "@/components/guest/SignupConversionModal";
import {
  buildComponentScope,
  getScopeFunctionParameters,
  patchScopeForMissingIdentifiers,
} from "../utils/allowed-imports";
import { AgentAppErrorBoundary } from "./AgentAppErrorBoundary";
import MarkdownStream from "@/components/MarkdownStream";
import PublicMessageOptionsMenu from "@/features/public-chat/components/PublicMessageOptionsMenu";
import type {
  TypedStreamEvent,
  ChunkPayload,
  ErrorPayload,
} from "@/types/python-generated/stream-events";
import type { PublicAgentApp } from "../types";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";

const HtmlPreviewModal = dynamic(
  () => import("@/features/html-pages/components/HtmlPreviewModal"),
  { ssr: false },
);

interface AgentAppPublicRendererProps {
  app: PublicAgentApp;
  slug: string;
  TestComponent?: React.ComponentType<{
    onExecute: (
      variables: Record<string, unknown>,
      userInput?: string,
    ) => Promise<void>;
    response: string;
    streamEvents: TypedStreamEvent[];
    isStreaming: boolean;
    isExecuting: boolean;
    error: unknown;
    rateLimitInfo: { remaining: number; total: number } | null;
    conversationId: string | null;
    onResetConversation: () => void;
  }>;
}

export function AgentAppPublicRenderer({
  app,
  slug,
  TestComponent,
}: AgentAppPublicRendererProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<{ type: string; message: string } | null>(
    null,
  );
  const [streamEvents, setStreamEvents] = useState<TypedStreamEvent[]>([]);
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [dbConversationId, setDbConversationId] = useState<string | null>(null);
  const dbConversationIdRef = useRef<string | null>(null);
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const streamEventsRef = useRef<TypedStreamEvent[]>([]);
  const streamRafIdRef = useRef<number | null>(null);

  const { isAuthenticated, fingerprintId } = useApiAuth();

  const guestLimit = useGuestLimit();

  useEffect(() => {
    if (!fingerprintId) return;
    guestLimit.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprintId]);

  useEffect(() => {
    return () => {
      if (executionTimeoutRef.current) clearTimeout(executionTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (streamRafIdRef.current !== null) {
        cancelAnimationFrame(streamRafIdRef.current);
      }
    };
  }, []);

  const validateVariables = useCallback(
    (variables: Record<string, unknown>) => {
      const errors: string[] = [];
      const valid: Record<string, unknown> = {};
      const schema = app.variable_schema;

      if (!Array.isArray(schema)) {
        return { validVariables: variables, validationErrors: [] };
      }

      for (const schemaItem of schema) {
        const { name, required, type, default: defaultValue } = schemaItem as {
          name: string;
          required?: boolean;
          type?: string;
          default?: unknown;
        };

        if (required && !(name in variables)) {
          if (defaultValue !== undefined) {
            valid[name] = defaultValue;
          } else {
            errors.push(`Missing required variable: ${name}`);
          }
        } else if (name in variables) {
          const value = variables[name];
          const normalizedType = type === "text" ? "string" : type;

          if (normalizedType === "string" || !normalizedType) {
            valid[name] = String(value);
          } else if (normalizedType === "number") {
            const numValue =
              typeof value === "number" ? value : Number(value);
            valid[name] = Number.isNaN(numValue) ? 0 : numValue;
          } else if (normalizedType === "boolean") {
            valid[name] = Boolean(value);
          } else {
            valid[name] = value;
          }
        } else if (defaultValue !== undefined) {
          valid[name] = defaultValue;
        }
      }

      return { validVariables: valid, validationErrors: errors };
    },
    [app.variable_schema],
  );

  const resetConversation = useCallback(() => {
    dbConversationIdRef.current = null;
    setDbConversationId(null);
    setStreamEvents([]);
    streamEventsRef.current = [];
    setIsStreamComplete(false);
    setError(null);
  }, []);

  const handleExecute = useCallback(
    async (variables: Record<string, unknown>, userInput?: string) => {
      setIsExecuting(true);
      setError(null);
      setStreamEvents([]);
      setIsStreamComplete(false);
      currentTaskIdRef.current = null;
      streamEventsRef.current = [];
      if (streamRafIdRef.current !== null) {
        cancelAnimationFrame(streamRafIdRef.current);
        streamRafIdRef.current = null;
      }

      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
        executionTimeoutRef.current = null;
      }

      abortControllerRef.current = new AbortController();

      try {
        const { validVariables, validationErrors } =
          validateVariables(variables);

        if (validationErrors.length > 0) {
          setError({
            type: "execution_error",
            message: validationErrors.join("; "),
          });
          setIsExecuting(false);
          return;
        }

        if (!isAuthenticated && !guestLimit.allowed) {
          setError({
            type: "execution_error",
            message:
              "You have reached the maximum number of free executions. Please sign up to continue.",
          });
          setIsExecuting(false);
          return;
        }

        const existingConversationId = dbConversationIdRef.current;

        const fetchResponse = await fetch(
          `/api/public/agent-apps/${slug}/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variables: validVariables,
              variables_provided: variables,
              user_input: userInput,
              fingerprint: fingerprintId,
              conversation_id: existingConversationId,
              metadata: {
                timestamp: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                conversation_id: existingConversationId,
              },
            }),
            signal: abortControllerRef.current.signal,
          },
        );

        if (!fetchResponse.ok) {
          let errorMsg = `HTTP ${fetchResponse.status}`;
          try {
            const errorData = await fetchResponse.json();
            if (
              typeof errorData.error === "object" &&
              errorData.error !== null
            ) {
              errorMsg =
                errorData.error.user_message ||
                errorData.error.message ||
                JSON.stringify(errorData.error);
            } else {
              errorMsg =
                errorData.error ||
                errorData.message ||
                errorData.detail ||
                errorMsg;
            }
            if (
              fetchResponse.status === 429 &&
              errorData.guest_limit
            ) {
              guestLimit.refresh();
            }
          } catch {
            // use default errorMsg
          }
          throw new Error(errorMsg);
        }

        if (!fetchResponse.body) {
          throw new Error("No response body from Agent API");
        }

        const serverConversationId =
          fetchResponse.headers.get("X-Conversation-ID") ?? uuidv4();
        dbConversationIdRef.current = serverConversationId;
        setDbConversationId(serverConversationId);

        const headerTaskId = fetchResponse.headers.get("X-Task-ID");
        if (headerTaskId) currentTaskIdRef.current = headerTaskId;

        let localChunkCount = 0;
        let localHasError = false;

        const { events } = parseNdjsonStream(
          fetchResponse,
          abortControllerRef.current.signal,
        );

        for await (const event of events) {
          streamEventsRef.current.push(event);
          if (streamRafIdRef.current === null) {
            streamRafIdRef.current = requestAnimationFrame(() => {
              streamRafIdRef.current = null;
              setStreamEvents([...streamEventsRef.current]);
            });
          }

          if (event.event === "chunk") localChunkCount++;

          if (event.event === "error") {
            localHasError = true;
            const errData = event.data as unknown as ErrorPayload;
            const errMsg =
              errData.user_message ||
              errData.message ||
              "Unknown error from stream";
            setError({ type: "stream_error", message: errMsg });
            if (currentTaskIdRef.current) {
              fetch(`/api/public/agent-apps/${slug}/execute`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  task_id: currentTaskIdRef.current,
                  error_type: "stream_error",
                  error_message: errMsg,
                }),
              }).catch(() => {});
            }
          }
        }

        if (streamRafIdRef.current !== null) {
          cancelAnimationFrame(streamRafIdRef.current);
          streamRafIdRef.current = null;
        }
        setStreamEvents([...streamEventsRef.current]);
        setIsStreamComplete(true);

        if (localChunkCount === 0 && !localHasError) {
          const emptyMsg = "The AI returned an empty response. Please try again.";
          setError({ type: "empty_result", message: emptyMsg });
          if (currentTaskIdRef.current) {
            fetch(`/api/public/agent-apps/${slug}/execute`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task_id: currentTaskIdRef.current,
                error_type: "empty_result",
                error_message: "Stream completed with no content chunks",
              }),
            }).catch(() => {});
          }
        }

        guestLimit.refresh();
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        if (e?.name === "AbortError") {
          // silent
        } else {
          const errMsg = e?.message || "Execution failed";
          setError({ type: "execution_error", message: errMsg });
          if (currentTaskIdRef.current) {
            fetch(`/api/public/agent-apps/${slug}/execute`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task_id: currentTaskIdRef.current,
                error_type: "execution_error",
                error_message: errMsg,
              }),
            }).catch(() => {});
          }
        }
      } finally {
        setIsExecuting(false);
        abortControllerRef.current = null;
      }
    },
    [
      slug,
      isAuthenticated,
      fingerprintId,
      guestLimit,
      validateVariables,
    ],
  );

  const CustomUIComponent = useMemo(() => {
    if (TestComponent) return TestComponent;
    if (!app.component_code) return null;

    try {
      let processedCode = app.component_code.replace(
        /import\s+.*?from\s+['"].*?['"];?\s*/g,
        "",
      );

      const babelResult = transform(processedCode, {
        presets: ["react", "typescript"],
        filename: "component.tsx",
      });

      let transformed = babelResult.code || "";

      transformed = transformed.replace(/export\s+default\s+/g, "return ");

      const scope = buildComponentScope(
        (app.allowed_imports as unknown) ?? [],
      );

      if (transformed) {
        patchScopeForMissingIdentifiers(transformed, scope);
      }

      const { paramNames, paramValues } = getScopeFunctionParameters(scope);

      const componentFactory = new Function(...paramNames, transformed);
      const Component = componentFactory(...paramValues);

      return Component as React.ComponentType<Record<string, unknown>>;
    } catch (err) {
      console.error("Failed to transform custom UI:", err);
      return null;
    }
  }, [app.component_code, app.allowed_imports, TestComponent]);

  const responseText = useMemo(() => {
    return streamEvents
      .filter((e) => e.event === "chunk")
      .map((e) => (e.data as unknown as ChunkPayload).text)
      .join("");
  }, [streamEvents]);

  const { open: openCanvas } = useCanvas();

  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [htmlPreviewContent, setHtmlPreviewContent] = useState("");
  const [htmlPreviewTitle, setHtmlPreviewTitle] = useState("");

  const handleShowHtmlPreview = useCallback(
    (html: string, title?: string) => {
      setHtmlPreviewContent(html);
      setHtmlPreviewTitle(title || app.name || "HTML Preview");
      setHtmlPreviewOpen(true);
    },
    [app.name],
  );

  const handleOpenCanvas = useCallback(() => {
    openCanvas({
      type: "html",
      data: { html: responseText },
      metadata: {
        title: app.name || "Response",
        sourceMessageId: dbConversationId ?? undefined,
      },
    });
  }, [openCanvas, responseText, app.name, dbConversationId]);

  const [isCopied, setIsCopied] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const handleCopy = useCallback(async () => {
    if (!responseText) return;
    try {
      await navigator.clipboard.writeText(responseText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [responseText]);

  const showActionBar = isStreamComplete && !!responseText;

  return (
    <div className="h-full flex flex-col">
      {guestLimit.showWarning && (
        <div className="flex-shrink-0 p-4">
          <GuestLimitWarning
            remaining={guestLimit.remaining}
            onDismiss={guestLimit.dismissWarning}
          />
        </div>
      )}

      <SignupConversionModal
        isOpen={guestLimit.showSignupModal}
        onClose={guestLimit.dismissSignupModal}
        totalUsed={guestLimit.totalUsed}
      />

      <div className="flex-1 overflow-auto">
        {CustomUIComponent ? (
          <AgentAppErrorBoundary appName={app.name}>
            <CustomUIComponent
              onExecute={handleExecute}
              response={responseText}
              streamEvents={streamEvents}
              isStreaming={!isStreamComplete && isExecuting}
              isExecuting={isExecuting}
              error={error}
              rateLimitInfo={
                !isAuthenticated
                  ? { remaining: guestLimit.remaining, total: 5 }
                  : null
              }
              conversationId={dbConversationId}
              onResetConversation={resetConversation}
            />
          </AgentAppErrorBoundary>
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{app.name}</h1>
              {app.tagline && (
                <p className="text-muted-foreground">{app.tagline}</p>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Error
                  </p>
                  <p className="text-sm text-destructive/80">{error.message}</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <button
                onClick={() => handleExecute({})}
                disabled={isExecuting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? "Running..." : "Run"}
              </button>
            </div>

            {streamEvents.length > 0 && (
              <div className="bg-textured">
                <MarkdownStream
                  events={streamEvents}
                  isStreamActive={isExecuting && !isStreamComplete}
                  onError={(err) =>
                    setError({ type: "render_error", message: err })
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showActionBar && (
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border-t border-border/40">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            ref={moreButtonRef}
            onClick={() => setIsOptionsOpen(true)}
            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <PublicMessageOptionsMenu
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        content={responseText}
        anchorElement={moreButtonRef.current}
        onShowHtmlPreview={handleShowHtmlPreview}
        onOpenCanvas={handleOpenCanvas}
        onQuickHtmlShare={() => {}}
      />

      {htmlPreviewOpen && (
        <HtmlPreviewModal
          isOpen={htmlPreviewOpen}
          onClose={() => setHtmlPreviewOpen(false)}
          htmlContent={htmlPreviewContent}
          title={htmlPreviewTitle}
        />
      )}
    </div>
  );
}
