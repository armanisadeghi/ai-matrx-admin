'use client';

import { useState, useMemo, useEffect } from 'react';
import { transform } from '@babel/standalone';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import {
    selectPrimaryResponseTextByTaskId,
    selectPrimaryResponseEndedByTaskId
} from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import type { PromptApp, ExecuteAppResponse, RateLimitInfo, ExecutionErrorType } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';

interface PromptAppRendererProps {
    app: PromptApp;
    slug: string;
}

// Generate browser fingerprint (simple version)
function generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
    }
    const dataURL = canvas.toDataURL();
    
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        canvasHash: dataURL.slice(-50),
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    };
    
    return btoa(JSON.stringify(fingerprint));
}

export function PromptAppRenderer({ app, slug }: PromptAppRendererProps) {
    const dispatch = useAppDispatch();
    
    const [taskId, setTaskId] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
    const [error, setError] = useState<{ type: ExecutionErrorType; message: string } | null>(null);
    const [fingerprint, setFingerprint] = useState<string>('');
    
    // Get streaming response from Redux
    const response = useAppSelector(
        taskId ? selectPrimaryResponseTextByTaskId(taskId) : () => ''
    );
    
    const isStreamComplete = useAppSelector(
        taskId ? selectPrimaryResponseEndedByTaskId(taskId) : () => false
    );
    
    const isStreaming = !isStreamComplete;
    
    // Generate fingerprint on mount
    useEffect(() => {
        setFingerprint(generateFingerprint());
    }, []);
    
    // Execute handler that custom UI will call
    const handleExecute = async (variables: Record<string, any>) => {
        setIsExecuting(true);
        setError(null);
        
        try {
            // Call our API
            const res = await fetch(`/api/public/apps/${slug}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variables,
                    fingerprint,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                })
            });
            
            const data: ExecuteAppResponse = await res.json();
            
            setRateLimitInfo(data.rate_limit);
            
            if (!data.success || !data.task_id) {
                setError(data.error || {
                    type: 'execution_error',
                    message: 'Execution failed'
                });
                setIsExecuting(false);
                return;
            }
            
            // Success - we have task_id and chat_config
            setTaskId(data.task_id);
            
            // Submit to Socket.IO using Redux
            await dispatch(createAndSubmitTask({
                service: 'chat_service',
                taskName: 'direct_chat',
                taskData: {
                    chat_config: (data as any).chat_config
                },
                customTaskId: data.task_id
            })).unwrap();
            
        } catch (err) {
            console.error('Execution error:', err);
            setError({
                type: 'execution_error',
                message: err instanceof Error ? err.message : 'Unknown error occurred'
            });
        } finally {
            setIsExecuting(false);
        }
    };
    
    // Dynamically load and render custom component
    const CustomComponent = useMemo(() => {
        try {
            // Strip import statements since we'll provide them via scope
            let processedCode = app.component_code;
            
            // Remove all import statements
            processedCode = processedCode.replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, '');
            processedCode = processedCode.replace(/^import\s+['"].*['"];?\s*$/gm, '');
            
            // Transform JSX/TSX to JavaScript using Babel
            let { code } = transform(processedCode, {
                presets: ['react', 'typescript'],
                filename: 'custom-app.tsx'
            });
            
            // Remove export statements and prepend return for function declarations
            if (code) {
                code = code.replace(/^export\s+default\s+/m, 'return ');
                code = code.replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, '');
            }
            
            // Create safe imports object with only allowed dependencies
            const React = require('react');
            const { useState, useEffect, useMemo, useCallback } = React;
            const lucideReact = require('lucide-react');
            
            const allowedImports: Record<string, any> = {
                'react': React,
                'lucide-react': lucideReact,
            };
            
            // Add all Lucide icons to scope if allowed
            if (app.allowed_imports.includes('lucide-react')) {
                Object.assign(allowedImports, lucideReact);
            }
            
            // Add UI components if allowed
            if (app.allowed_imports.includes('@/components/ui/button')) {
                const { Button } = require('@/components/ui/button');
                allowedImports['Button'] = Button;
                allowedImports['@/components/ui/button'] = { Button };
            }
            if (app.allowed_imports.includes('@/components/ui/input')) {
                const { Input } = require('@/components/ui/input');
                allowedImports['Input'] = Input;
                allowedImports['@/components/ui/input'] = { Input };
            }
            if (app.allowed_imports.includes('@/components/ui/textarea')) {
                const { Textarea } = require('@/components/ui/textarea');
                allowedImports['Textarea'] = Textarea;
                allowedImports['@/components/ui/textarea'] = { Textarea };
            }
            if (app.allowed_imports.includes('@/components/ui/card')) {
                const cardExports = require('@/components/ui/card');
                Object.assign(allowedImports, cardExports);
                allowedImports['@/components/ui/card'] = cardExports;
            }
            if (app.allowed_imports.includes('@/components/ui/label')) {
                const { Label } = require('@/components/ui/label');
                allowedImports['Label'] = Label;
                allowedImports['@/components/ui/label'] = { Label };
            }
            if (app.allowed_imports.includes('@/components/ui/select')) {
                const selectExports = require('@/components/ui/select');
                Object.assign(allowedImports, selectExports);
                allowedImports['@/components/ui/select'] = selectExports;
            }
            if (app.allowed_imports.includes('@/components/ui/slider')) {
                const { Slider } = require('@/components/ui/slider');
                allowedImports['Slider'] = Slider;
                allowedImports['@/components/ui/slider'] = { Slider };
            }
            
            // Create component function with controlled scope
            // Build scope with only valid JS identifiers
            const scope: Record<string, any> = {
                React,
                useState,
                useEffect,
                useMemo,
                useCallback,
                EnhancedChatMarkdown,
                ...allowedImports
            };
            
            // Get valid parameter names (filter out invalid JS identifiers)
            const paramNames = Object.keys(scope).filter(key => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key));
            const paramValues = paramNames.map(key => scope[key]);
            
            // Wrap in function that captures exports
            const wrappedCode = `
                const exports = {};
                const module = { exports };
                
                ${code}
                
                // Try multiple ways to get the component
                return exports.default || module.exports.default || module.exports || null;
            `;
            
            const componentFunction = new Function(
                ...paramNames,
                wrappedCode
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
            {app.layout_config?.showBranding !== false && (
                <div className="border-b border-border bg-card">
                    <div className="container mx-auto px-4 py-4">
                        <h1 className="text-2xl font-bold text-foreground">{app.name}</h1>
                        {app.tagline && (
                            <p className="text-sm text-muted-foreground mt-1">{app.tagline}</p>
                        )}
                    </div>
                </div>
            )}
            
            {/* Rate Limit Warning */}
            {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
                <div className="bg-warning/10 border-b border-warning/30 px-4 py-2">
                    <p className="text-sm text-warning container mx-auto">
                        ⚠️ You have {rateLimitInfo.remaining} execution{rateLimitInfo.remaining !== 1 ? 's' : ''} remaining. 
                        <a href="/sign-up" className="underline ml-1">Create an account</a> for unlimited access.
                    </p>
                </div>
            )}
            
            {/* Custom Component Rendering */}
            <div 
                className="container mx-auto"
                style={{ maxWidth: app.layout_config?.maxWidth || '1200px' }}
            >
                <CustomComponent
                    onExecute={handleExecute}
                    response={response}
                    isStreaming={isStreaming}
                    isExecuting={isExecuting}
                    error={error}
                    rateLimitInfo={rateLimitInfo}
                    appName={app.name}
                    appTagline={app.tagline}
                    appCategory={app.category}
                />
            </div>
            
            {/* Footer (optional) */}
            {app.layout_config?.showCredit !== false && (
                <div className="border-t border-border mt-12 py-6">
                    <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                        <p>
                            Powered by <a href="/" className="text-primary hover:underline">AI Matrx</a>
                            {' • '}
                            <a href="/sign-up" className="text-primary hover:underline">Create your own AI app</a>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

