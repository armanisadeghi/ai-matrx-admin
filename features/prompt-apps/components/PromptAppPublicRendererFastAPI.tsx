'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { transform } from '@babel/standalone';
import { AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useGuestLimit } from '@/hooks/useGuestLimit';
import { GuestLimitWarning } from '@/components/guest/GuestLimitWarning';
import { SignupConversionModal } from '@/components/guest/SignupConversionModal';
import { buildComponentScope, getScopeFunctionParameters, patchScopeForMissingIdentifiers } from '../utils/allowed-imports';
import { PromptAppErrorBoundary } from './PromptAppErrorBoundary';
import MarkdownStream from '@/components/MarkdownStream';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import type { PromptApp } from '../types';
import type { AgentStreamEvent, AgentExecuteRequest, AgentWarmRequest } from '@/features/public-chat/types/agent-api';
import { useSelector } from 'react-redux';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';

interface PromptAppPublicRendererFastAPIProps {
    app: PromptApp;
    slug: string;
    /** Optional: Provide a pre-built component for testing instead of using dynamic component_code */
    TestComponent?: React.ComponentType<{
        onExecute: (variables: Record<string, any>, userInput?: string) => Promise<void>;
        response: string;
        streamEvents: StreamEvent[];
        isStreaming: boolean;
        isExecuting: boolean;
        error: any;
        rateLimitInfo: { remaining: number; total: number } | null;
    }>;
}

export function PromptAppPublicRendererFastAPI({ app, slug, TestComponent }: PromptAppPublicRendererFastAPIProps) {
    // Local state for execution
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<any>(null);
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [isStreamComplete, setIsStreamComplete] = useState(false);
    const [conversationId] = useState(() => uuidv4()); // Generate once per component instance
    const isFirstExecutionRef = useRef(true);
    const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Centralized auth - handles both authenticated users and guests
    const { getHeaders, waitForAuth, isAuthenticated, isAdmin, fingerprintId } = useApiAuth();
    
    // Server preference from Redux (admin feature)
    const useLocalhost = useSelector(selectIsUsingLocalhost);
    
    // Use guest limit hook for tracking and UI
    const guestLimit = useGuestLimit();
    
    // OPTIMIZATION: Proactively check guest limit in background (after fingerprint ready)
    useEffect(() => {
        if (!fingerprintId) return;
        // This caches the guest limit status for instant checking during execution
        guestLimit.refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fingerprintId]);
    
    // OPTIMIZATION: Pre-warm the agent on mount (cache the prompt for faster execution)
    // Skips localhost targets to avoid browser-level ERR_CONNECTION_REFUSED console noise.
    useEffect(() => {
        const promptId = app.prompt_id;
        if (!promptId) return;
        
        const warmAgent = async () => {
            try {
                // Admin can override to use localhost
                const BACKEND_URL = (isAdmin && useLocalhost) 
                    ? 'http://localhost:8000' 
                    : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com');

                // Never eagerly warm to localhost — the browser will log
                // ERR_CONNECTION_REFUSED which cannot be suppressed from JS.
                if (BACKEND_URL.includes('localhost')) return;
                
                const warmRequest: AgentWarmRequest = {
                    prompt_id: promptId,
                    is_builtin: false
                };
                
                await fetch(`${BACKEND_URL}/api/ai/agent/warm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(warmRequest),
                });
            } catch {
                // Silently ignore — warming is non-critical
            }
        };
        
        warmAgent();
    }, [app.prompt_id, isAdmin, useLocalhost]);
    
    // Cleanup timeout and abort controller on unmount
    useEffect(() => {
        return () => {
            if (executionTimeoutRef.current) {
                clearTimeout(executionTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    
    // OPTIMIZATION: Client-side variable validation (instant, no API call)
    const validateVariables = useCallback((variables: Record<string, any>) => {
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
                const normalizedType = (type as any) === 'text' ? 'string' : type;

                if (normalizedType === 'string' || !normalizedType) {
                    valid[name] = String(value);
                } else if (normalizedType === 'number') {
                    const numValue = typeof value === 'number' ? value : Number(value);
                    valid[name] = isNaN(numValue) ? 0 : numValue;
                } else if (normalizedType === 'boolean') {
                    valid[name] = Boolean(value);
                } else {
                    valid[name] = value;
                }
            } else if (defaultValue !== undefined) {
                valid[name] = defaultValue;
            }
        }

        return { validVariables: valid, validationErrors: errors };
    }, [app.variable_schema]);

    // Convert Agent API events to our StreamEvent format for MarkdownStream
    const convertAgentEventToStreamEvent = useCallback((agentEvent: AgentStreamEvent): StreamEvent | null => {
        switch (agentEvent.event) {
            case 'chunk':
                return {
                    event: 'chunk',
                    data: agentEvent.data
                };
            case 'status_update':
                return {
                    event: 'status_update',
                    data: agentEvent.data
                };
            case 'tool_update':
                return {
                    event: 'tool_update',
                    data: agentEvent.data
                };
            case 'data':
                return {
                    event: 'data',
                    data: agentEvent.data
                };
            case 'error':
                return {
                    event: 'error',
                    data: agentEvent.data
                };
            case 'end':
                return {
                    event: 'end',
                    data: true
                };
            default:
                return null;
        }
    }, []);
    
    // Execute handler with Agent API streaming
    const handleExecute = useCallback(async (variables: Record<string, any>, userInput?: string) => {
        const perfStart = performance.now();
        let firstEventReceived = false;
        
        const logTiming = (milestone: string) => {
            const elapsed = performance.now() - perfStart;
            console.log(`⏱️ [Agent API] [${elapsed.toFixed(1)}ms] ${milestone}`);
        };
        
        logTiming('🚀 EXECUTION STARTED (Agent API)');
        
        setIsExecuting(true);
        setError(null);
        setStreamEvents([]);
        setIsStreamComplete(false);
        
        // Clear any existing timeout
        if (executionTimeoutRef.current) {
            clearTimeout(executionTimeoutRef.current);
            executionTimeoutRef.current = null;
        }
        
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        try {
            // STEP 1: Validate variables CLIENT-SIDE
            const { validVariables, validationErrors } = validateVariables(variables);
            logTiming('✓ Client-side validation complete');
            
            if (validationErrors.length > 0) {
                setError({
                    type: 'execution_error',
                    message: validationErrors.join('; ')
                });
                setIsExecuting(false);
                return;
            }
            
            // STEP 2: Check guest limit from CACHE
            if (!isAuthenticated && !guestLimit.allowed) {
                logTiming('✗ Guest limit exceeded');
                setError({
                    type: 'execution_error',
                    message: 'You have reached the maximum number of free executions. Please sign up to continue.'
                });
                setIsExecuting(false);
                return;
            }
            logTiming('✓ Guest limit check passed');
            
            // STEP 3: Verify prompt ID exists
            const promptId = app.prompt_id;
            if (!promptId) {
                setError({
                    type: 'execution_error',
                    message: 'Prompt configuration not available'
                });
                setIsExecuting(false);
                return;
            }
            logTiming('✓ Prompt ID verified');
            
            // STEP 4: Wait for auth to be ready and get headers
            const authReady = await waitForAuth();
            if (!authReady) {
                setError({
                    type: 'auth_error',
                    message: 'Unable to verify access. Please refresh the page.'
                });
                setIsExecuting(false);
                return;
            }
            
            // Admin can override to use localhost
            const BACKEND_URL = (isAdmin && useLocalhost) 
                ? 'http://localhost:8000' 
                : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com');
            
            // Get auth headers (handles both authenticated users and guests)
            const headers = getHeaders();
            
            const agentRequest: AgentExecuteRequest = {
                prompt_id: promptId,
                conversation_id: conversationId,
                is_new_conversation: isFirstExecutionRef.current,
                variables: validVariables,
                user_input: userInput,
                stream: true,
                debug: false,
                is_builtin: false,
            };
            
            logTiming('➡️ Initiating Agent API request...');
            const fetchStartTime = performance.now();
            
            const fetchResponse = await fetch(`${BACKEND_URL}/api/ai/agent/execute`, {
                method: 'POST',
                headers,
                body: JSON.stringify(agentRequest),
                signal: abortControllerRef.current.signal,
            });
            
            logTiming(`✓ Response received from Agent API (network: ${(performance.now() - fetchStartTime).toFixed(1)}ms)`);
            
            if (!fetchResponse.ok) {
                // Try to parse error response
                let errorMsg = `HTTP ${fetchResponse.status}`;
                try {
                    const errorData = await fetchResponse.json();
                    console.log('errorData', JSON.stringify(errorData, null, 2));
                    if (typeof errorData.error === 'object' && errorData.error !== null) {
                        errorMsg = (errorData.error.user_message || errorData.error.user_visible_message) || errorData.error.message || JSON.stringify(errorData.error);
                    } else {
                        errorMsg = errorData.error || errorData.message || errorData.detail || errorData.details || errorMsg;
                    }
                } catch (e) {
                    // Use default error
                }
                throw new Error(errorMsg);
            }
            
            if (!fetchResponse.body) {
                throw new Error('No response body from Agent API');
            }
            
            // 🔥 BACKGROUND LOGGING: Fire-and-forget logging request (ZERO latency impact)
            logTiming('🔥 Firing background logging request...');
            fetch(`/api/public/apps/${slug}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: app.id,
                    variables_provided: variables,
                    variables_used: validVariables,
                    fingerprint: fingerprintId,
                    chat_config: { prompt_id: promptId, conversation_id: conversationId },
                    metadata: {
                        timestamp: new Date().toISOString(),
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        agent_api: true, // Flag to indicate this used Agent API
                        conversation_id: conversationId
                    }
                })
            }).then(res => res.json()).then(data => {
                // Update guest limit in background when logging completes
                if (data.guest_limit) {
                    guestLimit.refresh();
                }
            }).catch(err => {
                // Silently handle logging errors - don't impact user experience
                console.debug('Background logging error (non-critical):', err);
            });
            
            // STEP 5: Process streaming NDJSON response from Agent API
            const reader = fetchResponse.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let buffer = '';
            
            logTiming('✓ Stream reader initialized, awaiting Agent API events...');
            
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                
                if (value) {
                    if (!firstEventReceived) {
                        logTiming('📥 First event received from Agent API');
                        firstEventReceived = true;
                    }
                    
                    // Decode chunk and add to buffer
                    const decodedChunk = decoder.decode(value, { stream: true });
                    buffer += decodedChunk;
                    
                    // Process complete lines (NDJSON format)
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const agentEvent = JSON.parse(line) as AgentStreamEvent;
                                
                                // Convert Agent event to StreamEvent
                                const streamEvent = convertAgentEventToStreamEvent(agentEvent);
                                if (streamEvent) {
                                    setStreamEvents(prev => [...prev, streamEvent]);
                                }
                                
                                // Check for error events
                                if (agentEvent.event === 'error') {
                                    const errData = agentEvent.data;
                                    setError({
                                        type: 'stream_error',
                                        message: (errData.user_message || errData.user_visible_message) || errData.message || 'Unknown error from stream'
                                    });
                                }
                            } catch (e) {
                                console.warn('Failed to parse Agent API event:', line, e);
                            }
                        }
                    }
                }
            }
            
            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const agentEvent = JSON.parse(buffer) as AgentStreamEvent;
                    const streamEvent = convertAgentEventToStreamEvent(agentEvent);
                    if (streamEvent) {
                        setStreamEvents(prev => [...prev, streamEvent]);
                    }
                } catch (e) {
                    console.warn('Failed to parse final Agent API event:', buffer, e);
                }
            }
            
            logTiming('✅ Stream complete from Agent API');
            isFirstExecutionRef.current = false;
            setIsStreamComplete(true);
            
        } catch (error: any) {
            if (error.name === 'AbortError') {
                logTiming('⚠️ Request aborted');
            } else {
                logTiming(`❌ Error: ${error.message}`);
                console.error('Agent API execution error:', error);
                setError({
                    type: 'execution_error',
                    message: error.message || 'Execution failed'
                });
            }
        } finally {
            setIsExecuting(false);
            abortControllerRef.current = null;
        }
    }, [app, slug, conversationId, isAdmin, useLocalhost, isAuthenticated, fingerprintId, guestLimit, waitForAuth, getHeaders, validateVariables, convertAgentEventToStreamEvent]);

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
            let processedCode = app.component_code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
            
            // Transform JSX/TSX to JS
            const babelResult = transform(processedCode, {
                presets: ['react', 'typescript'],
                filename: 'component.tsx',
            });
            
            let transformed = babelResult.code || '';
            
            // Replace "export default" with "return"
            transformed = transformed.replace(/export\s+default\s+/g, 'return ');
            
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
            console.error('Failed to transform custom UI:', error);
            return null;
        }
    }, [app.component_code, app.allowed_imports, TestComponent]);

    // Extract response text from stream events for backward compatibility
    const responseText = useMemo(() => {
        return streamEvents
            .filter(e => e.event === 'chunk' && typeof e.data === 'string')
            .map(e => e.data)
            .join('');
    }, [streamEvents]);

    // Admin localhost toggle is now in the header (AdminMenu)
    // No need for local toggle - reads from Redux

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
                            rateLimitInfo={!isAuthenticated ? {
                                remaining: guestLimit.remaining,
                                total: 5
                            } : null}
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
                                    <p className="text-sm font-medium text-destructive mb-1">Error</p>
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
                                {isExecuting ? 'Running...' : 'Run'}
                            </button>
                        </div>

                        {streamEvents.length > 0 && (
                            <div className="bg-textured">
                                <MarkdownStream
                                    events={streamEvents}
                                    isStreamActive={isExecuting && !isStreamComplete}
                                    role="assistant"
                                    onError={(err) => setError({ type: 'render_error', message: err })}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}