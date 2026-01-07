'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { transform } from '@babel/standalone';
import { AlertCircle, Server } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getFingerprint } from '@/lib/services/fingerprint-service';
import { useGuestLimit } from '@/hooks/useGuestLimit';
import { GuestLimitWarning } from '@/components/guest/GuestLimitWarning';
import { SignupConversionModal } from '@/components/guest/SignupConversionModal';
import { buildComponentScope, getScopeFunctionParameters } from '../utils/allowed-imports';
import MarkdownStream from '@/components/MarkdownStream';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import type { PromptApp } from '../types';
import type { AgentStreamEvent, AgentExecuteRequest, AgentWarmRequest } from '@/types/agent-api';

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
    // Simple local state - NO Redux or Socket.IO! Uses Agent API (/api/agent/execute)
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<any>(null);
    const [fingerprint, setFingerprint] = useState('');
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [isStreamComplete, setIsStreamComplete] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [conversationId] = useState(() => uuidv4()); // Generate once per component instance
    const [isAdmin, setIsAdmin] = useState(false);
    const [useLocalhost, setUseLocalhost] = useState(() => {
        // Load from localStorage on mount
        if (typeof window !== 'undefined') {
            return localStorage.getItem('admin_use_localhost') === 'true';
        }
        return false;
    });
    const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Use guest limit hook for tracking and UI
    const guestLimit = useGuestLimit();
    
    // Generate fingerprint on mount using centralized service
    useEffect(() => {
        getFingerprint().then(fp => setFingerprint(fp));
    }, []);
    
    // Check for authentication token and admin status on mount
    useEffect(() => {
        async function checkAuth() {
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                setAuthToken(session?.access_token || null);
                
                // Check if user is an admin
                if (session?.user?.id) {
                    const { data: adminData } = await supabase
                        .from('admins')
                        .select('user_id')
                        .eq('user_id', session.user.id)
                        .maybeSingle();
                    
                    setIsAdmin(!!adminData);
                }
            } catch (err) {
                setAuthToken(null);
                setIsAdmin(false);
            }
        }
        checkAuth();
    }, []);
    
    // OPTIMIZATION: Proactively check guest limit in background (after fingerprint ready)
    useEffect(() => {
        if (!fingerprint) return;
        // This caches the guest limit status for instant checking during execution
        guestLimit.refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fingerprint]);
    
    // OPTIMIZATION: Pre-warm the agent on mount (cache the prompt for faster execution)
    useEffect(() => {
        const promptId = app.prompt_id;
        if (!promptId) return;
        
        const warmAgent = async () => {
            try {
                // Admin can override to use localhost
                const BACKEND_URL = (isAdmin && useLocalhost) 
                    ? 'http://localhost:8000' 
                    : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com');
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                const warmRequest: AgentWarmRequest = {
                    prompt_id: promptId,
                    is_builtin: false
                };
                
                await fetch(`${BACKEND_URL}/api/agent/warm`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(warmRequest),
                });
                
                console.log('✅ Agent pre-warmed and cached');
            } catch (err) {
                // Non-critical error, just log it
                console.warn('⚠️ Failed to pre-warm agent (non-critical):', err);
            }
        };
        
        warmAgent();
    }, [app.prompt_id, authToken, isAdmin, useLocalhost]);
    
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
            if (!authToken && !guestLimit.allowed) {
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
            
            // STEP 4: Build Agent API request (much simpler!)
            // Admin can override to use localhost
            const BACKEND_URL = (isAdmin && useLocalhost) 
                ? 'http://localhost:8000' 
                : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com');
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            const agentRequest: AgentExecuteRequest = {
                prompt_id: promptId,
                conversation_id: conversationId,
                variables: validVariables,
                user_input: userInput,
                stream: true,
                debug: false,
                is_builtin: false
            };
            
            logTiming('➡️ Initiating Agent API request...');
            const fetchStartTime = performance.now();
            
            const fetchResponse = await fetch(`${BACKEND_URL}/api/agent/execute`, {
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
                    if (typeof errorData.error === 'object' && errorData.error !== null) {
                        errorMsg = errorData.error.user_visible_message || errorData.error.message || JSON.stringify(errorData.error);
                    } else {
                        errorMsg = errorData.error || errorData.message || errorData.details || errorMsg;
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
                    fingerprint,
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
                                        message: errData.user_visible_message || errData.message || 'Unknown error from stream'
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
    }, [app, slug, authToken, fingerprint, conversationId, guestLimit, validateVariables, convertAgentEventToStreamEvent]);

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
    }, [app.component_code, TestComponent]);

    // Extract response text from stream events for backward compatibility
    const responseText = useMemo(() => {
        return streamEvents
            .filter(e => e.event === 'chunk' && typeof e.data === 'string')
            .map(e => e.data)
            .join('');
    }, [streamEvents]);

    // Toggle localhost handler
    const handleToggleLocalhost = useCallback(() => {
        const newValue = !useLocalhost;
        setUseLocalhost(newValue);
        localStorage.setItem('admin_use_localhost', String(newValue));
    }, [useLocalhost]);

    return (
        <div className="h-full flex flex-col">
            {/* Admin localhost toggle */}
            {isAdmin && (
                <div className="flex-shrink-0 px-4 pt-2">
                    <button
                        onClick={handleToggleLocalhost}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-colors"
                        title={useLocalhost ? 'Using localhost:8000' : 'Using production server'}
                    >
                        <Server className="h-3.5 w-3.5" />
                        <span className="font-medium">
                            {useLocalhost ? '🏠 localhost:8000' : '🌐 Production'}
                        </span>
                    </button>
                </div>
            )}
            
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
                    <CustomUIComponent
                        onExecute={handleExecute}
                        response={responseText}
                        streamEvents={streamEvents}
                        isStreaming={!isStreamComplete && isExecuting}
                        isExecuting={isExecuting}
                        error={error}
                        rateLimitInfo={!authToken ? {
                            remaining: guestLimit.remaining,
                            total: 5
                        } : null}
                    />
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
