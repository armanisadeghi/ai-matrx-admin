'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { transform } from '@babel/standalone';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { AlertCircle } from 'lucide-react';
import { getFingerprint } from '@/lib/services/fingerprint-service';
import { useGuestLimit } from '@/hooks/useGuestLimit';
import { GuestLimitWarning } from '@/components/guest/GuestLimitWarning';
import { SignupConversionModal } from '@/components/guest/SignupConversionModal';
import type { PromptApp } from '../types';

interface ExecuteAppResponse {
    success: boolean;
    task_id?: string;
    socket_config?: {
        service: string;
        task_name: string;
        task_data: Record<string, any>;
    };
    error?: {
        type: string;
        message: string;
    };
    guest_limit?: {
        allowed: boolean;
        remaining: number;
        total_used: number;
        is_blocked: boolean;
    };
}

interface PromptAppPublicRendererProps {
    app: PromptApp;
    slug: string;
}

export function PromptAppPublicRenderer({ app, slug }: PromptAppPublicRendererProps) {
    // Simple local state - NO Redux!
    const [taskId, setTaskId] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<any>(null);
    const [fingerprint, setFingerprint] = useState('');
    const [response, setResponse] = useState<string>('');
    const [isStreamComplete, setIsStreamComplete] = useState(false);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const socketRef = useRef<any>(null);
    const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Use guest limit hook for tracking and UI
    const guestLimit = useGuestLimit();
    
    // Generate fingerprint on mount using centralized service
    useEffect(() => {
        getFingerprint().then(fp => setFingerprint(fp));
    }, []);
    
    // OPTIMIZATION: Proactively check guest limit in background (after fingerprint ready)
    useEffect(() => {
        if (!fingerprint) return;
        // This caches the guest limit status for instant checking during execution
        guestLimit.refresh();
    }, [fingerprint, guestLimit]);
    
    // Pre-establish socket connection on mount (after fingerprint is ready)
    useEffect(() => {
        if (!fingerprint) return;
        
        async function setupSocket() {
            try {
                // Dynamically import socket.io-client (client-side only)
                const { io } = await import('socket.io-client');
                const { createClient } = await import('@/utils/supabase/client');
                
                const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
                const SOCKET_NAMESPACE = '/UserSession';
                const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000001';
                
                // Try to get auth token if user is logged in
                let authToken: string | null = null;
                let isAuthenticated = false;
                
                try {
                    const supabase = createClient();
                    const { data: { session } } = await supabase.auth.getSession();
                    authToken = session?.access_token || null;
                    isAuthenticated = !!authToken;
                    console.log('🔑 User authenticated:', isAuthenticated);
                } catch (err) {
                    console.log('⚠️ No auth session, using public access');
                }
                
                const socketOptions: any = {
                    transports: ['websocket', 'polling'],
                    reconnection: false,
                    timeout: 10000,
                    withCredentials: true,
                };
                
                if (isAuthenticated && authToken) {
                    // Authenticated user: use their token
                    socketOptions.auth = { token: authToken };
                    console.log('✅ Using authenticated user token');
                } else {
                    // Public/anonymous user: use public system user + fingerprint for tracking
                    socketOptions.auth = { 
                        user_id: PUBLIC_USER_ID,
                        public_access: true,
                        fingerprint: fingerprint
                    };
                    console.log('🌐 Using public system user with fingerprint:', fingerprint.substring(0, 8) + '...');
                }
                
                const newSocket = io(`${BACKEND_URL}${SOCKET_NAMESPACE}`, socketOptions);
                socketRef.current = newSocket;
                
                newSocket.on('connect', () => {
                    console.log('✅ Socket pre-connected and ready');
                    setIsSocketReady(true);
                });
                
                newSocket.on('connect_error', (err) => {
                    console.error('❌ Socket connection error:', err);
                    console.error('❌ Backend URL was:', BACKEND_URL);
                    console.error('❌ Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
                    setIsSocketReady(false);
                });
                
            } catch (err) {
                console.error('Socket setup error:', err);
                setIsSocketReady(false);
            }
        }
        
        setupSocket();
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsSocketReady(false);
        };
    }, [fingerprint]);
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (executionTimeoutRef.current) {
                clearTimeout(executionTimeoutRef.current);
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
    
    // Execute handler
    const handleExecute = useCallback(async (variables: Record<string, any>) => {
        // Check if socket is ready
        if (!isSocketReady || !socketRef.current) {
            setError({
                type: 'connection_error',
                message: 'Connection not ready. Please wait a moment and try again.'
            });
            return;
        }
        
        setIsExecuting(true);
        setError(null);
        setResponse('');
        setIsStreamComplete(false);
        
        // Clear any existing timeout
        if (executionTimeoutRef.current) {
            clearTimeout(executionTimeoutRef.current);
            executionTimeoutRef.current = null;
        }
        
        try {
            // OPTIMIZATION 1: Validate variables CLIENT-SIDE (instant, no API call)
            const { validVariables, validationErrors } = validateVariables(variables);
            
            if (validationErrors.length > 0) {
                setError({
                    type: 'execution_error',
                    message: validationErrors.join('; ')
                });
                setIsExecuting(false);
                return;
            }
            
            // OPTIMIZATION 2: Check guest limit from CACHE (instant, no API call)
            if (!guestLimit.allowed) {
                setError({
                    type: 'execution_error',
                    message: 'You have reached the maximum number of free executions. Please sign up to continue.'
                });
                setIsExecuting(false);
                return;
            }
            
            // OPTIMIZATION 3: Resolve variables CLIENT-SIDE (instant, no API call)
            if (!app.prompt?.messages) {
                setError({
                    type: 'execution_error',
                    message: 'Prompt data not available'
                });
                setIsExecuting(false);
                return;
            }
            
            const resolvedMessages = resolveVariablesInMessages(app.prompt.messages, validVariables);
            
            // OPTIMIZATION 4: Build chat config CLIENT-SIDE (instant, no API call)
            const chatConfig = buildChatConfig(resolvedMessages);
            
            // OPTIMIZATION 5: Minimal API call (just for logging + task_id) (~10-20ms)
            const res = await fetch(`/api/public/apps/${slug}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: app.id,
                    variables_provided: variables,
                    variables_used: validVariables,
                    fingerprint,
                    chat_config: chatConfig, // Pre-built config
                    metadata: {
                        timestamp: new Date().toISOString(),
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        model_id: chatConfig.model_id
                    }
                })
            });
            
            const data: ExecuteAppResponse = await res.json();
            
            // Update guest limit state in background
            if (data.guest_limit) {
                guestLimit.refresh();
            }
            
            if (!data.success || !data.task_id) {
                setError(data.error || {
                    type: 'execution_error',
                    message: 'Execution failed'
                });
                setIsExecuting(false);
                return;
            }
            
            setTaskId(data.task_id);
            
            // OPTIMIZATION 6: IMMEDIATELY emit task using pre-established socket
            const socket = socketRef.current;
            
            socket.emit(
                'chat_service',
                {
                    taskName: 'direct_chat',
                    taskData: { chat_config: chatConfig },
                },
                (response: { response_listener_events?: string[] }) => {
                    const eventNames = response?.response_listener_events || [];
                    
                    if (!eventNames.length) {
                        setError({
                            type: 'execution_error',
                            message: 'No response received from server'
                        });
                        setIsExecuting(false);
                        setIsStreamComplete(true);
                        return;
                    }
                    
                    console.log('📡 Listening to events:', eventNames);
                    
                    // Listen to all response events
                    eventNames.forEach((eventName: string) => {
                        socket.on(eventName, (data: any) => {
                            if (typeof data === 'string') {
                                // Stream text chunks
                                setResponse(prev => prev + data);
                            } else if (data?.end) {
                                // Stream ended
                                console.log('✅ Stream complete');
                                setIsExecuting(false);
                                setIsStreamComplete(true);
                                // Clear timeout on completion
                                if (executionTimeoutRef.current) {
                                    clearTimeout(executionTimeoutRef.current);
                                    executionTimeoutRef.current = null;
                                }
                                socket.off(eventName);
                            } else if (data?.error) {
                                // Error received
                                setError({
                                    type: 'execution_error',
                                    message: data.error.message || 'Error during execution'
                                });
                                setIsExecuting(false);
                                setIsStreamComplete(true);
                                // Clear timeout on error
                                if (executionTimeoutRef.current) {
                                    clearTimeout(executionTimeoutRef.current);
                                    executionTimeoutRef.current = null;
                                }
                                socket.off(eventName);
                            }
                        });
                    });
                }
            );
            
            // Set execution timeout (2 minutes)
            executionTimeoutRef.current = setTimeout(() => {
                console.error('⏱️ Execution timed out');
                setError({
                    type: 'timeout',
                    message: 'Request timed out. Please try again.'
                });
                setIsExecuting(false);
                setIsStreamComplete(true);
            }, 120000); // 2 minute timeout
            
        } catch (err) {
            console.error('Execution error:', err);
            setError({
                type: 'execution_error',
                message: err instanceof Error ? err.message : 'Unknown error occurred'
            });
            setIsExecuting(false);
        }
    }, [slug, app, fingerprint, isSocketReady, guestLimit, validateVariables, resolveVariablesInMessages, buildChatConfig]);
    
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
            
            const React = require('react');
            const { useState, useEffect, useMemo, useCallback } = React;
            const lucideReact = require('lucide-react');
            
            // Build scope with only valid JS identifiers (no special chars)
            const scope: Record<string, any> = {
                React,
                useState,
                useEffect,
                useMemo,
                useCallback,
                EnhancedChatMarkdown,
            };
            
            // Add all Lucide icons directly to scope
            if (app.allowed_imports.includes('lucide-react')) {
                Object.assign(scope, lucideReact);
            }
            
            // Add UI components
            if (app.allowed_imports.includes('@/components/ui/button')) {
                const { Button } = require('@/components/ui/button');
                scope.Button = Button;
            }
            if (app.allowed_imports.includes('@/components/ui/input')) {
                const { Input } = require('@/components/ui/input');
                scope.Input = Input;
            }
            if (app.allowed_imports.includes('@/components/ui/textarea')) {
                const { Textarea } = require('@/components/ui/textarea');
                scope.Textarea = Textarea;
            }
            if (app.allowed_imports.includes('@/components/ui/card')) {
                const cardExports = require('@/components/ui/card');
                Object.assign(scope, cardExports);
            }
            if (app.allowed_imports.includes('@/components/ui/label')) {
                const { Label } = require('@/components/ui/label');
                scope.Label = Label;
            }
            if (app.allowed_imports.includes('@/components/ui/select')) {
                const selectExports = require('@/components/ui/select');
                Object.assign(scope, selectExports);
            }
            if (app.allowed_imports.includes('@/components/ui/slider')) {
                const { Slider } = require('@/components/ui/slider');
                scope.Slider = Slider;
            }
            
            // Get valid parameter names (filter out invalid JS identifiers)
            const paramNames = Object.keys(scope).filter(key => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key));
            const paramValues = paramNames.map(key => scope[key]);
            
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
                isStreaming={!isStreamComplete && !!taskId}
                isExecuting={isExecuting}
                error={error}
            />
        </>
    );
}

