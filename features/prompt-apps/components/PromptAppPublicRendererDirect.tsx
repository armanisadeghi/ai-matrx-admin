'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { transform } from '@babel/standalone';
import { AlertCircle } from 'lucide-react';
import { getFingerprint } from '@/lib/services/fingerprint-service';
import { useGuestLimit } from '@/hooks/useGuestLimit';
import { GuestLimitWarning } from '@/components/guest/GuestLimitWarning';
import { SignupConversionModal } from '@/components/guest/SignupConversionModal';
import { buildComponentScope, getScopeFunctionParameters } from '../utils/allowed-imports';
import type { PromptApp } from '../types';

interface PromptAppPublicRendererDirectProps {
    app: PromptApp;
    slug: string;
}

export function PromptAppPublicRendererDirect({ app, slug }: PromptAppPublicRendererDirectProps) {
    // Simple local state - NO Redux or Socket.IO!
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<any>(null);
    const [fingerprint, setFingerprint] = useState('');
    const [response, setResponse] = useState<string>('');
    const [isStreamComplete, setIsStreamComplete] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Use guest limit hook for tracking and UI
    const guestLimit = useGuestLimit();
    
    // Generate fingerprint on mount using centralized service
    useEffect(() => {
        getFingerprint().then(fp => setFingerprint(fp));
    }, []);
    
    // Check for authentication token on mount
    useEffect(() => {
        async function checkAuth() {
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                setAuthToken(session?.access_token || null);
            } catch (err) {
                setAuthToken(null);
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
    }, [fingerprint]); // Only run when fingerprint changes, not when guestLimit object changes
    
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
                } else if (normalizedType === 'array') {
                    valid[name] = Array.isArray(value) ? value : [value];
                } else {
                    valid[name] = value;
                }
            } else if (defaultValue !== undefined) {
                valid[name] = defaultValue;
            } else {
                valid[name] = '';
            }
        }

        return { validVariables: valid, validationErrors: errors };
    }, [app.variable_schema]);

    // OPTIMIZATION: Client-side variable resolution (instant, no API call)
    const resolveVariablesInMessages = useCallback((messages: any[], variables: Record<string, any>) => {
        return messages.map(msg => {
            let content = msg.content;

            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                content = content.replace(regex, String(value));
            });

            return {
                role: msg.role,
                content,
                ...(msg.metadata && { metadata: msg.metadata })
            };
        });
    }, []);

    // OPTIMIZATION: Client-side chat config building (instant, no API call)
    const buildChatConfig = useCallback((resolvedMessages: any[]) => {
        if (!app.prompt?.settings?.model_id) {
            throw new Error('No model specified in prompt settings');
        }

        const { model_id, ...modelConfig } = app.prompt.settings;

        return {
            model_id,
            messages: resolvedMessages,
            stream: true,
            ...modelConfig
        };
    }, [app.prompt]);
    
    // Execute handler with direct API streaming
    const handleExecute = useCallback(async (variables: Record<string, any>) => {
        // ⏱️ PERFORMANCE TIMING START
        const perfStart = performance.now();
        let firstTextReceived = false;
        
        const logTiming = (milestone: string) => {
            const elapsed = performance.now() - perfStart;
            console.log(`⏱️ [${elapsed.toFixed(1)}ms] ${milestone}`);
        };
        
        logTiming('🚀 EXECUTION STARTED');
        
        setIsExecuting(true);
        setError(null);
        setResponse('');
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
            if (!guestLimit.allowed) {
                logTiming('✗ Guest limit exceeded');
                setError({
                    type: 'execution_error',
                    message: 'You have reached the maximum number of free executions. Please sign up to continue.'
                });
                setIsExecuting(false);
                return;
            }
            logTiming('✓ Guest limit check passed');
            
            // STEP 3: Resolve variables CLIENT-SIDE
            if (!app.prompt?.messages) {
                setError({
                    type: 'execution_error',
                    message: 'Prompt data not available'
                });
                setIsExecuting(false);
                return;
            }
            
            const resolvedMessages = resolveVariablesInMessages(app.prompt.messages, validVariables);
            logTiming('✓ Variables resolved in messages');
            
            // STEP 4: Build chat config CLIENT-SIDE
            const chatConfig = buildChatConfig(resolvedMessages);
            logTiming('✓ Chat config built');
            
            // STEP 5: Prepare backend request
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            logTiming('➡️ Initiating fetch to backend...');
            const fetchStartTime = performance.now();
            
            const fetchResponse = await fetch(`${BACKEND_URL}/api/chat/direct`, {
                method: 'POST',
                headers,
                body: JSON.stringify(chatConfig),
                signal: abortControllerRef.current.signal,
            });
            
            logTiming(`✓ Response received (network: ${(performance.now() - fetchStartTime).toFixed(1)}ms)`);
            
            if (!fetchResponse.ok) {
                throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
            }
            
            if (!fetchResponse.body) {
                throw new Error('No response body');
            }
            
            // 🔥 BACKGROUND LOGGING: Fire-and-forget logging request (ZERO latency impact)
            // This happens in parallel with stream processing and doesn't block UI
            logTiming('🔥 Firing background logging request...');
            fetch(`/api/public/apps/${slug}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: app.id,
                    variables_provided: variables,
                    variables_used: validVariables,
                    fingerprint,
                    chat_config: chatConfig,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        model_id: chatConfig.model_id,
                        direct_api: true, // Flag to indicate this used direct API
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
            
            // STEP 6: Process streaming JSONL response
            const reader = fetchResponse.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let buffer = '';
            
            logTiming('✓ Stream reader initialized, awaiting data...');
            
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                
                if (value) {
                    if (!firstTextReceived) {
                        logTiming('📥 First data chunk received from backend');
                    }
                    
                    // Decode chunk and add to buffer
                    const decodedChunk = decoder.decode(value, { stream: true });
                    buffer += decodedChunk;
                    
                    // Process complete lines (JSONL format - newline-delimited JSON)
                    const lines = buffer.split('\n');
                    // Keep the last incomplete line in buffer
                    buffer = lines.pop() || '';
                    
                    // Process each complete line
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const json = JSON.parse(line);
                                
                                // Handle different event types
                                if (json.event === 'chunk' && typeof json.data === 'string') {
                                    if (!firstTextReceived) {
                                        firstTextReceived = true;
                                        logTiming('✨ FIRST TEXT CHUNK RECEIVED - TIME TO FIRST TOKEN');
                                    }
                                    // Accumulate text chunks
                                    setResponse(prev => prev + json.data);
                                } else if (json.event === 'end') {
                                    // Stream completed successfully
                                    logTiming('✅ Stream complete');
                                    setIsExecuting(false);
                                    setIsStreamComplete(true);
                                    // Clear timeout on completion
                                    if (executionTimeoutRef.current) {
                                        clearTimeout(executionTimeoutRef.current);
                                        executionTimeoutRef.current = null;
                                    }
                                } else if (json.event === 'error') {
                                    // Error from backend
                                    throw new Error(json.data?.message || 'Error during execution');
                                }
                            } catch (e) {
                                if (e instanceof Error && e.message.includes('Error during execution')) {
                                    throw e; // Re-throw execution errors
                                }
                                // JSON parse errors - silently continue
                            }
                        }
                    }
                }
            }
            
            // Process any remaining buffer
            if (buffer.trim()) {
                try {
                    const json = JSON.parse(buffer);
                    if (json.event === 'chunk' && typeof json.data === 'string') {
                        if (!firstTextReceived) {
                            firstTextReceived = true;
                            logTiming('✨ FIRST TEXT CHUNK RECEIVED (from buffer)');
                        }
                        setResponse(prev => prev + json.data);
                    } else if (json.event === 'end') {
                        logTiming('✅ Stream complete (from buffer)');
                        setIsStreamComplete(true);
                    }
                } catch (e) {
                    // Silently handle parse errors
                }
            }
            
            // Mark as complete if not already marked
            if (!isStreamComplete) {
                setIsStreamComplete(true);
            }
            
            // Guest limit is updated via background logging request
            
        } catch (err) {
            logTiming('❌ Error occurred');
            
            // Don't show error if request was aborted (user cancelled)
            if (err instanceof Error && err.name === 'AbortError') {
                // Silently handle abort
            } else {
                setError({
                    type: 'execution_error',
                    message: err instanceof Error ? err.message : 'Unknown error occurred'
                });
            }
            setIsStreamComplete(true);
        } finally {
            setIsExecuting(false);
            // Clear timeout on completion
            if (executionTimeoutRef.current) {
                clearTimeout(executionTimeoutRef.current);
                executionTimeoutRef.current = null;
            }
        }
    }, [app, authToken, guestLimit, validateVariables, resolveVariablesInMessages, buildChatConfig, isStreamComplete]);
    
    // Dynamically load custom component
    const CustomComponent = useMemo(() => {
        try {
            let processedCode = app.component_code;
            processedCode = processedCode.replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, '');
            processedCode = processedCode.replace(/^import\s+['"].*['"];?\s*$/gm, '');
            
            let { code } = transform(processedCode, {
                presets: ['react', 'typescript'],
                filename: 'custom-app.tsx'
            });
            
            // Remove export statements and prepend return for function declarations
            if (code) {
                code = code.replace(/^export\s+default\s+/m, 'return ');
                code = code.replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, '');
            }
            
            // Build component scope using centralized import resolver
            const scope = buildComponentScope(app.allowed_imports);
            
            // Get valid parameter names (filter out invalid JS identifiers)
            const { paramNames, paramValues } = getScopeFunctionParameters(scope);
            
            // Code now starts with 'return function...' so it will return the component directly
            const componentFunction = new Function(
                ...paramNames,
                code
            );
            
            return componentFunction(...paramValues);
            
        } catch (err) {
            console.error('Component render error:', err);
            return () => (
                <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-destructive">Component Error</h3>
                            <p className="text-sm text-destructive/80 mt-1">
                                Failed to load app component.
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
    
    if (!CustomComponent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-destructive">Failed to load app component</p>
            </div>
        );
    }
    
    return (
        <>
            {/* Guest limit warning (shows after 3 executions) */}
            {guestLimit.showWarning && (
                <GuestLimitWarning
                    remaining={guestLimit.remaining}
                    onDismiss={guestLimit.dismissWarning}
                />
            )}
            
            {/* Signup conversion modal (shows at 5 executions) */}
            <SignupConversionModal
                isOpen={guestLimit.showSignupModal}
                onClose={guestLimit.dismissSignupModal}
                totalUsed={guestLimit.totalUsed}
            />
            
            <CustomComponent
                onExecute={handleExecute}
                response={response}
                isStreaming={!isStreamComplete && isExecuting}
                isExecuting={isExecuting}
                error={error}
            />
        </>
    );
}

