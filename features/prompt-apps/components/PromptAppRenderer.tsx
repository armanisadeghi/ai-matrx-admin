"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { transform } from "@babel/standalone";
import { v4 as uuidv4 } from "uuid";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useSelector } from "react-redux";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import {
  buildComponentScope,
  getScopeFunctionParameters,
} from "../utils/allowed-imports";
import type {
  PromptApp,
  RateLimitInfo,
  ExecutionErrorType,
  LayoutConfig,
} from "../types";

function layoutConfigFromDb(raw: PromptApp["layout_config"]): LayoutConfig {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as LayoutConfig;
  }
  return {};
}
import type {
  TypedStreamEvent,
  ChunkPayload,
  ErrorPayload,
} from "@/types/python-generated/stream-events";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { ENDPOINTS, BACKEND_URLS } from "@/lib/api/endpoints";
import { AlertCircle } from "lucide-react";
import MarkdownStream from "@/components/MarkdownStream";

interface PromptAppRendererProps {
  app: PromptApp;
  slug: string;
}

export function PromptAppRenderer({ app, slug }: PromptAppRendererProps) {
  const layoutConfig = layoutConfigFromDb(app.layout_config);
  const [isExecuting, setIsExecuting] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(
    null,
  );
  const [error, setError] = useState<{
    type: ExecutionErrorType;
    message: string;
  } | null>(null);
  const [streamEvents, setStreamEvents] = useState<TypedStreamEvent[]>([]);
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [dbConversationId, setDbConversationId] = useState<string | null>(null);
  const dbConversationIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { getHeaders, waitForAuth, isAdmin, fingerprintId } = useApiAuth();
  const resolvedBaseUrl = useSelector(
    selectResolvedBaseUrl as (state: unknown) => string | undefined,
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const resetConversation = useCallback(() => {
    dbConversationIdRef.current = null;
    setDbConversationId(null);
    setStreamEvents([]);
    setIsStreamComplete(false);
    setError(null);
  }, []);

  const handleExecute = useCallback(
    async (variables: Record<string, any>, userInput?: string) => {
      setIsExecuting(true);
      setError(null);
      setStreamEvents([]);
      setIsStreamComplete(false);

      abortControllerRef.current = new AbortController();

      try {
        const authReady = await waitForAuth();
        if (!authReady) {
          setError({
            type: "execution_error",
            message: "Unable to verify access. Please refresh the page.",
          });
          setIsExecuting(false);
          return;
        }

        const BACKEND_URL = resolvedBaseUrl ?? BACKEND_URLS.production;

        const headers = getHeaders();

        const existingConversationId = dbConversationIdRef.current;
        const agentRequest = existingConversationId
          ? { user_input: userInput ?? "", stream: true, debug: false }
          : { variables, user_input: userInput, stream: true, debug: false };
        // First execution → use the new app execution endpoint (backend resolves pinned prompt version)
        // Follow-up → continue via the existing conversation
        const executeUrl = existingConversationId
          ? `${BACKEND_URL}${ENDPOINTS.ai.conversationContinue(existingConversationId)}`
          : `${BACKEND_URL}${ENDPOINTS.ai.appExecute(app.id)}`;

        const fetchResponse = await fetch(executeUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(agentRequest),
          signal: abortControllerRef.current.signal,
        });

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
          } catch {
            // Use default
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

        // Background logging (fire-and-forget)
        fetch(`/api/public/apps/${slug}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_id: app.id,
            variables_provided: variables,
            variables_used: variables,
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
            if (data.rate_limit) setRateLimitInfo(data.rate_limit);
          })
          .catch(() => {});

        const { events } = parseNdjsonStream(
          fetchResponse,
          abortControllerRef.current.signal,
        );

        for await (const event of events) {
          setStreamEvents((prev) => [...prev, event]);

          if (event.event === "error") {
            const errData = event.data as unknown as ErrorPayload;
            setError({
              type: "execution_error",
              message:
                errData.user_message ||
                errData.message ||
                "Unknown error from stream",
            });
          }
        }

        setIsStreamComplete(true);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Agent API execution error:", err);
        setError({
          type: "execution_error",
          message: err.message || "Execution failed",
        });
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
      fingerprintId,
      waitForAuth,
      getHeaders,
      resetConversation,
    ],
  );

  const response = useMemo(() => {
    return streamEvents
      .filter((e) => e.event === "chunk")
      .map((e) => (e.data as unknown as ChunkPayload).text)
      .join("");
  }, [streamEvents]);

  // Dynamically load and render custom component
  const CustomComponent = useMemo(() => {
    try {
      // Strip import statements since we'll provide them via scope
      let processedCode = app.component_code;

      // Remove all import statements
      processedCode = processedCode.replace(
        /^import\s+.*from\s+['"].*['"];?\s*$/gm,
        "",
      );
      processedCode = processedCode.replace(/^import\s+['"].*['"];?\s*$/gm, "");

      // Transform JSX/TSX to JavaScript using Babel
      let { code } = transform(processedCode, {
        presets: ["react", "typescript"],
        filename: "custom-app.tsx",
      });

      // Remove export statements and prepend return for function declarations
      if (code) {
        code = code.replace(/^export\s+default\s+/m, "return ");
        code = code.replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, "");
      }

      // Build component scope using centralized import resolver
      const scope = buildComponentScope(app.allowed_imports);

      // Get valid parameter names (filter out invalid JS identifiers)
      const { paramNames, paramValues } = getScopeFunctionParameters(scope);

      // Code now starts with 'return function...' so it will return the component directly
      const componentFunction = new Function(...paramNames, code);

      return componentFunction(...paramValues);
    } catch (err) {
      console.error("Component render error:", err);
      return () => (
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">
                Component Error
              </h3>
              <p className="text-sm text-destructive/80 mt-1">
                Failed to load app component. Please contact the app creator.
              </p>
              {err instanceof Error && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {err.message}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
  }, [app.component_code, app.allowed_imports]);

  return (
    <div className="min-h-dvh bg-background">
      {/* App Header (optional, based on layout_config) */}
      {layoutConfig.showBranding !== false && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">{app.name}</h1>
            {app.tagline && (
              <p className="text-sm text-muted-foreground mt-1">
                {app.tagline}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rate Limit Warning */}
      {rateLimitInfo &&
        rateLimitInfo.remaining <= 2 &&
        rateLimitInfo.remaining > 0 && (
          <div className="bg-warning/10 border-b border-warning/30 px-4 py-2">
            <p className="text-sm text-warning container mx-auto">
              ⚠️ You have {rateLimitInfo.remaining} execution
              {rateLimitInfo.remaining !== 1 ? "s" : ""} remaining.
              <a href="/sign-up" className="underline ml-1">
                Create an account
              </a>{" "}
              for unlimited access.
            </p>
          </div>
        )}

      {/* Custom Component Rendering */}
      <div
        className="container mx-auto"
        style={{ maxWidth: layoutConfig.maxWidth || "1200px" }}
      >
        <CustomComponent
          onExecute={handleExecute}
          response={response}
          streamEvents={streamEvents}
          isStreaming={!isStreamComplete && isExecuting}
          isExecuting={isExecuting}
          error={error}
          rateLimitInfo={rateLimitInfo}
          appName={app.name}
          appTagline={app.tagline}
          appCategory={app.category}
          conversationId={dbConversationId}
          onResetConversation={resetConversation}
        />
      </div>

      {/* Footer (optional) */}
      {layoutConfig.showCredit !== false && (
        <div className="border-t border-border mt-12 py-6">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>
              Powered by{" "}
              <a href="/" className="text-primary hover:underline">
                AI Matrx
              </a>
              {" • "}
              <a href="/sign-up" className="text-primary hover:underline">
                Create your own AI app
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
