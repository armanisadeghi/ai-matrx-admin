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
            // Transform JSX/TSX to JavaScript using Babel
            const { code } = transform(app.component_code, {
                presets: ['react', 'typescript'],
                filename: 'custom-app.tsx'
            });
            
            // Create safe imports object with only allowed dependencies
            const allowedImports: Record<string, any> = {
                'react': require('react'),
                'lucide-react': require('lucide-react'),
            };
            
            // Add UI components if allowed
            if (app.allowed_imports.includes('@/components/ui/button')) {
                allowedImports['@/components/ui/button'] = require('@/components/ui/button');
            }
            if (app.allowed_imports.includes('@/components/ui/input')) {
                allowedImports['@/components/ui/input'] = require('@/components/ui/input');
            }
            if (app.allowed_imports.includes('@/components/ui/textarea')) {
                allowedImports['@/components/ui/textarea'] = require('@/components/ui/textarea');
            }
            if (app.allowed_imports.includes('@/components/ui/card')) {
                allowedImports['@/components/ui/card'] = require('@/components/ui/card');
            }
            if (app.allowed_imports.includes('@/components/ui/label')) {
                allowedImports['@/components/ui/label'] = require('@/components/ui/label');
            }
            if (app.allowed_imports.includes('@/components/ui/select')) {
                allowedImports['@/components/ui/select'] = require('@/components/ui/select');
            }
            if (app.allowed_imports.includes('@/components/ui/slider')) {
                allowedImports['@/components/ui/slider'] = require('@/components/ui/slider');
            }
            
            // Create component function with controlled scope
            const componentFunction = new Function(
                'React',
                'useState',
                'useEffect',
                'useMemo',
                'useCallback',
                'EnhancedChatMarkdown',
                'allowedImports',
                `
                // Helper to import from allowed list
                const require = (path) => {
                    if (!allowedImports[path]) {
                        throw new Error('Import "' + path + '" is not allowed');
                    }
                    return allowedImports[path];
                };
                
                ${code}
                
                // Return the default export or the component
                return typeof exports !== 'undefined' && exports.default 
                    ? exports.default 
                    : Component;
                `
            );
            
            const React = require('react');
            const { useState, useEffect, useMemo, useCallback } = React;
            
            return componentFunction(
                React,
                useState,
                useEffect,
                useMemo,
                useCallback,
                EnhancedChatMarkdown,
                allowedImports
            );
            
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

