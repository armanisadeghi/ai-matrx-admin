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
import { PromptAppErrorBoundary } from "./PromptAppErrorBoundary";
import MarkdownStream from "@/components/MarkdownStream";
import PublicMessageOptionsMenu from "@/features/public-chat/components/PublicMessageOptionsMenu";
import type {
  TypedStreamEvent,
  ChunkPayload,
  ErrorPayload,
} from "@/types/python-generated/stream-events";
import type { PromptApp } from "../types";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { ENDPOINTS, BACKEND_URLS } from "@/lib/api/endpoints";
import { useSelector } from "react-redux";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";

const HtmlPreviewModal = dynamic(
  () => import("@/features/html-pages/components/HtmlPreviewModal"),
  { ssr: false },
);
const QuickHtmlShareModal = dynamic(() => import("./QuickHtmlShareModal"), {
  ssr: false,
});

interface PromptAppPublicRendererFastAPIProps {
  app: PromptApp;
  slug: string;
  /** Optional: Provide a pre-built component for testing instead of using dynamic component_code */
  TestComponent?: React.ComponentType<{
    onExecute: (
      variables: Record<string, any>,
      userInput?: string,
    ) => Promise<void>;
    response: string;
    streamEvents: TypedStreamEvent[];
    isStreaming: boolean;
    isExecuting: boolean;
    error: any;
    rateLimitInfo: { remaining: number; total: number } | null;
    conversationId: string | null;
    onResetConversation: () => void;
  }>;
}

export function PromptAppPublicRendererFastAPI({
  app,
  slug,
  TestComponent,
}: PromptAppPublicRendererFastAPIProps) {
  // Local state for execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<any>(null);
  const [streamEvents, setStreamEvents] = useState<TypedStreamEvent[]>([]);
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [dbConversationId, setDbConversationId] = useState<string | null>(null);
  const dbConversationIdRef = useRef<string | null>(null);
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track the task_id from the logging call so we can update it on failure
  const currentTaskIdRef = useRef<string | null>(null);
  // Accumulate events in a ref and flush to state via RAF to throttle renders during fast streaming
  const streamEventsRef = useRef<TypedStreamEvent[]>([]);
  const streamRafIdRef = useRef<number | null>(null);

  // Centralized auth - handles both authenticated users and guests
  const { getHeaders, waitForAuth, isAuthenticated, isAdmin, fingerprintId } =
    useApiAuth();

  // Server preference from Redux — resolves the active server for all users
  const resolvedBaseUrl = useSelector(
    selectResolvedBaseUrl as (state: unknown) => string | undefined,
  );

  // Use guest limit hook for tracking and UI
  const guestLimit = useGuestLimit();

  // OPTIMIZATION: Proactively check guest limit in background (after fingerprint ready)
  useEffect(() => {
    if (!fingerprintId) return;
    // This caches the guest limit status for instant checking during execution
    guestLimit.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprintId]);

  // Cleanup timeout, abort controller, and RAF on unmount
  useEffect(() => {
    return () => {
      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (streamRafIdRef.current !== null) {
        cancelAnimationFrame(streamRafIdRef.current);
      }
    };
  }, []);

  // OPTIMIZATION: Client-side variable validation (instant, no API call)
  const validateVariables = useCallback(
    (variables: Record<string, any>) => {
      const errors: string[] = [];
      const valid: Record<string, any> = {};
      const schema = app.variable_schema;

      if (!Array.isArray(schema)) {
        return { validVariables: variables, validationErrors: [] };
      }

      for (const schemaItem of schema) {
        const { name, required, type, default: defaultValue } = schemaItem;

        if (required && !(name in variables)) {
          if (defaultValue !== undefined) {
            valid[name] = defaultValue;
          } else {
            errors.push(`Missing required variable: ${name}`);
          }
        } else if (name in variables) {
          const value = variables[name];
          const normalizedType = (type as any) === "text" ? "string" : type;

          if (normalizedType === "string" || !normalizedType) {
            valid[name] = String(value);
          } else if (normalizedType === "number") {
            const numValue = typeof value === "number" ? value : Number(value);
            valid[name] = isNaN(numValue) ? 0 : numValue;
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

  // Execute handler with Agent API streaming
  const handleExecute = useCallback(
    async (variables: Record<string, any>, userInput?: string) => {
      const perfStart = performance.now();
      let firstEventReceived = false;
      let localChunkCount = 0;
      let localHasError = false;

      const logTiming = (milestone: string) => {
        const elapsed = performance.now() - perfStart;
        console.log(`⏱️ [Agent API] [${elapsed.toFixed(1)}ms] ${milestone}`);
      };

      logTiming("🚀 EXECUTION STARTED (Agent API)");

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

      // Clear any existing timeout
      if (executionTimeoutRef.current) {
        clearTimeout(executionTimeoutRef.current);
        executionTimeoutRef.current = null;
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // STEP 1: Validate variables CLIENT-SIDE
        const { validVariables, validationErrors } =
          validateVariables(variables);
        logTiming("✓ Client-side validation complete");

        if (validationErrors.length > 0) {
          setError({
            type: "execution_error",
            message: validationErrors.join("; "),
          });
          setIsExecuting(false);
          return;
        }

        // STEP 2: Check guest limit from CACHE
        if (!isAuthenticated && !guestLimit.allowed) {
          logTiming("✗ Guest limit exceeded");
          setError({
            type: "execution_error",
            message:
              "You have reached the maximum number of free executions. Please sign up to continue.",
          });
          setIsExecuting(false);
          return;
        }
        logTiming("✓ Guest limit check passed");

        // STEP 3: Wait for auth to be ready and get headers
        // waitForAuth always resolves (falls back to temp fingerprint), so we
        // never block execution — just warn if it somehow failed.
        await waitForAuth();

        const BACKEND_URL = resolvedBaseUrl ?? BACKEND_URLS.production;

        const headers = getHeaders();

        const existingConversationId = dbConversationIdRef.current;
        const agentRequest = existingConversationId
          ? { user_input: userInput ?? "", stream: true, debug: false }
          : {
              variables: validVariables,
              user_input: userInput,
              stream: true,
              debug: false,
            };
        // First execution → use the new app execution endpoint (backend resolves pinned prompt version)
        // Follow-up → continue via the existing conversation
        const executeUrl = existingConversationId
          ? `${BACKEND_URL}${ENDPOINTS.ai.conversationContinue(existingConversationId)}`
          : `${BACKEND_URL}${ENDPOINTS.ai.appExecute(app.id)}`;

        logTiming("Initiating Agent API request...");
        const fetchStartTime = performance.now();

        const fetchResponse = await fetch(executeUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(agentRequest),
          signal: abortControllerRef.current.signal,
        });

        logTiming(
          `✓ Response received from Agent API (network: ${(performance.now() - fetchStartTime).toFixed(1)}ms)`,
        );

        if (!fetchResponse.ok) {
          // Try to parse error response
          let errorMsg = `HTTP ${fetchResponse.status}`;
          try {
            const errorData = await fetchResponse.json();
            console.log("errorData", JSON.stringify(errorData, null, 2));
            if (
              typeof errorData.error === "object" &&
              errorData.error !== null
            ) {
              errorMsg =
                errorData.error.user_message ||
                errorData.error.user_visible_message ||
                errorData.error.message ||
                JSON.stringify(errorData.error);
            } else {
              errorMsg =
                errorData.error ||
                errorData.message ||
                errorData.detail ||
                errorData.details ||
                errorMsg;
            }
          } catch (e) {
            // Use default error
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

        // 🔥 BACKGROUND LOGGING: Fire-and-forget logging request (ZERO latency impact)
        logTiming("🔥 Firing background logging request...");
        fetch(`/api/public/apps/${slug}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_id: app.id,
            variables_provided: variables,
            variables_used: validVariables,
            fingerprint: fingerprintId,
            chat_config: {
              app_id: app.id,
              conversation_id: serverConversationId,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              agent_api: true,
              conversation_id: serverConversationId,
            },
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            // Capture task_id so we can update the record on failure
            if (data.task_id) {
              currentTaskIdRef.current = data.task_id;
            }
            // Update guest limit in background when logging completes
            if (data.guest_limit) {
              guestLimit.refresh();
            }
          })
          .catch((err) => {
            // Silently handle logging errors - don't impact user experience
            console.debug("Background logging error (non-critical):", err);
          });

        // STEP 5: Process streaming NDJSON response using shared parser
        const { events } = parseNdjsonStream(
          fetchResponse,
          abortControllerRef.current.signal,
        );

        logTiming("Stream reader initialized, awaiting Agent API events...");

        for await (const event of events) {
          if (!firstEventReceived) {
            logTiming("First event received from Agent API");
            firstEventReceived = true;
          }

          // Accumulate into ref to avoid one setState per event during fast streaming
          streamEventsRef.current.push(event);
          if (streamRafIdRef.current === null) {
            streamRafIdRef.current = requestAnimationFrame(() => {
              streamRafIdRef.current = null;
              setStreamEvents([...streamEventsRef.current]);
            });
          }

          if (event.event === "chunk") {
            localChunkCount++;
          }

          if (event.event === "error") {
            localHasError = true;
            const errData = event.data as unknown as ErrorPayload;
            const errMsg =
              errData.user_message ||
              errData.message ||
              "Unknown error from stream";
            setError({
              type: "stream_error",
              message: errMsg,
            });
            // Patch DB record to mark as failed
            if (currentTaskIdRef.current) {
              fetch(`/api/public/apps/${slug}/execute`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  task_id: currentTaskIdRef.current,
                  error_type: "stream_error",
                  error_message: errMsg,
                }),
              }).catch(() => {
                /* non-critical */
              });
            }
          }
        }

        logTiming("Stream complete from Agent API");
        // Final flush: cancel any pending RAF and commit all remaining events synchronously
        if (streamRafIdRef.current !== null) {
          cancelAnimationFrame(streamRafIdRef.current);
          streamRafIdRef.current = null;
        }
        setStreamEvents([...streamEventsRef.current]);
        setIsStreamComplete(true);

        // Detect empty result: stream finished but no text chunks received
        if (localChunkCount === 0 && !localHasError) {
          const emptyResultError = {
            type: "empty_result",
            message: "The AI returned an empty response. Please try again.",
          };
          setError(emptyResultError);
          if (currentTaskIdRef.current) {
            fetch(`/api/public/apps/${slug}/execute`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task_id: currentTaskIdRef.current,
                error_type: "empty_result",
                error_message: "Stream completed with no content chunks",
              }),
            }).catch(() => {
              /* non-critical */
            });
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          logTiming("⚠️ Request aborted");
        } else {
          logTiming(`❌ Error: ${error.message}`);
          console.error("Agent API execution error:", error);
          const errMsg = error.message || "Execution failed";
          setError({
            type: "execution_error",
            message: errMsg,
          });
          // Patch DB record to mark as failed if we have a task_id
          if (currentTaskIdRef.current) {
            fetch(`/api/public/apps/${slug}/execute`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task_id: currentTaskIdRef.current,
                error_type: "execution_error",
                error_message: errMsg,
              }),
            }).catch(() => {
              /* non-critical */
            });
          }
        }
      } finally {
        setIsExecuting(false);
        abortControllerRef.current = null;
      }
    },
    [
      app,
      slug,
      isAdmin,
      resolvedBaseUrl,
      isAuthenticated,
      fingerprintId,
      guestLimit,
      waitForAuth,
      getHeaders,
      validateVariables,
      resetConversation,
    ],
  );

  // Transform and render custom UI component
  // If TestComponent is provided, use it directly (for testing purposes)
  const CustomUIComponent = useMemo(() => {
    // If a test component is provided, use it directly (bypasses dynamic transformation)
    if (TestComponent) {
      return TestComponent;
    }

    if (!app.component_code) return null;

    try {
      // Remove imports (they're provided via scope)
      let processedCode = app.component_code.replace(
        /import\s+.*?from\s+['"].*?['"];?\s*/g,
        "",
      );

      // Transform JSX/TSX to JS
      const babelResult = transform(processedCode, {
        presets: ["react", "typescript"],
        filename: "component.tsx",
      });

      let transformed = babelResult.code || "";

      // Replace "export default" with "return"
      transformed = transformed.replace(/export\s+default\s+/g, "return ");

      // Build scope with allowed imports
      const scope = buildComponentScope(app.allowed_imports || []);

      // Patch scope with fallbacks for any PascalCase identifiers in the code
      // that aren't already available (e.g., non-existent Lucide icons)
      if (transformed) {
        patchScopeForMissingIdentifiers(transformed, scope);
      }

      // Get valid parameter names (filter out invalid JS identifiers)
      const { paramNames, paramValues } = getScopeFunctionParameters(scope);

      // Create the component function
      const componentFactory = new Function(...paramNames, transformed);
      const Component = componentFactory(...paramValues);

      return Component;
    } catch (error) {
      console.error("Failed to transform custom UI:", error);
      return null;
    }
  }, [app.component_code, app.allowed_imports, TestComponent]);

  // Extract response text from stream events for backward compatibility
  const responseText = useMemo(() => {
    return streamEvents
      .filter((e) => e.event === "chunk")
      .map((e) => (e.data as unknown as ChunkPayload).text)
      .join("");
  }, [streamEvents]);

  // Canvas hook
  const { open: openCanvas } = useCanvas();

  // HTML preview modal state
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [htmlPreviewContent, setHtmlPreviewContent] = useState("");
  const [htmlPreviewTitle, setHtmlPreviewTitle] = useState("");

  // Quick HTML share modal state
  const [quickShareOpen, setQuickShareOpen] = useState(false);

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

  // Action bar state (copy + options menu)
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
      {/* Guest limit warning */}
      {guestLimit.showWarning && (
        <div className="flex-shrink-0 p-4">
          <GuestLimitWarning
            remaining={guestLimit.remaining}
            onDismiss={guestLimit.dismissWarning}
          />
        </div>
      )}

      {/* Signup conversion modal */}
      <SignupConversionModal
        isOpen={guestLimit.showSignupModal}
        onClose={guestLimit.dismissSignupModal}
        totalUsed={guestLimit.totalUsed}
      />

      {/* Custom UI or fallback */}
      <div className="flex-1 overflow-auto">
        {CustomUIComponent ? (
          <PromptAppErrorBoundary appName={app.name}>
            <CustomUIComponent
              onExecute={handleExecute}
              response={responseText}
              streamEvents={streamEvents}
              isStreaming={!isStreamComplete && isExecuting}
              isExecuting={isExecuting}
              error={error}
              rateLimitInfo={
                !isAuthenticated
                  ? {
                      remaining: guestLimit.remaining,
                      total: 5,
                    }
                  : null
              }
              conversationId={dbConversationId}
              onResetConversation={resetConversation}
            />
          </PromptAppErrorBoundary>
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

      {/* Response action bar — appears when stream completes and there is content */}
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

      {/* Options menu portal */}
      <PublicMessageOptionsMenu
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        content={responseText}
        anchorElement={moreButtonRef.current}
        onShowHtmlPreview={handleShowHtmlPreview}
        onOpenCanvas={handleOpenCanvas}
        onQuickHtmlShare={() => setQuickShareOpen(true)}
      />

      {/* HTML preview modal — dynamically loaded, zero initial bundle cost */}
      {htmlPreviewOpen && (
        <HtmlPreviewModal
          isOpen={htmlPreviewOpen}
          onClose={() => setHtmlPreviewOpen(false)}
          htmlContent={htmlPreviewContent}
          title={htmlPreviewTitle}
        />
      )}

      {/* Quick HTML share modal — lightweight, no external CSS */}
      {quickShareOpen && (
        <QuickHtmlShareModal
          isOpen={quickShareOpen}
          onClose={() => setQuickShareOpen(false)}
          markdown={responseText}
          title={app.name}
        />
      )}
    </div>
  );
}
