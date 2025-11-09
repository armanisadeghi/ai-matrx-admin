'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { transform } from '@babel/standalone';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { AlertCircle } from 'lucide-react';
import type { PromptApp } from '../types';

interface ExecuteAppResponse {
    success: boolean;
    task_id?: string;
    error?: {
        type: string;
        message: string;
    };
    rate_limit?: {
        remaining: number;
        total: number;
        reset_at: string;
    };
}

interface PromptAppPublicRendererProps {
    app: PromptApp;
    slug: string;
}

function generateFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const txt = 'fingerprint';
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText(txt, 2, 2);
        }
        return canvas.toDataURL().slice(-50);
    } catch {
        return Math.random().toString(36).substring(7);
    }
}

export function PromptAppPublicRenderer({ app, slug }: PromptAppPublicRendererProps) {
    // Simple local state - NO Redux!
    const [taskId, setTaskId] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<any>(null);
    const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
    const [fingerprint, setFingerprint] = useState('');
    const [response, setResponse] = useState<string>('');
    const [isStreamComplete, setIsStreamComplete] = useState(false);
    
    // Generate fingerprint on mount
    useEffect(() => {
        setFingerprint(generateFingerprint());
    }, []);
    
    // Poll for response updates when we have a taskId
    useEffect(() => {
        if (!taskId || isStreamComplete) return;
        
        let pollInterval: NodeJS.Timeout;
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes max (120 * 1000ms)
        
        const pollResponse = async () => {
            try {
                const res = await fetch(`/api/public/apps/response/${taskId}`);
                const data = await res.json();
                
                if (data.response) {
                    setResponse(data.response);
                }
                
                if (data.completed || data.error) {
                    setIsStreamComplete(true);
                    clearInterval(pollInterval);
                    
                    if (data.error) {
                        setError({
                            type: 'execution_error',
                            message: data.error
                        });
                    }
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setIsStreamComplete(true);
                    setError({
                        type: 'timeout',
                        message: 'Request timed out'
                    });
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        };
        
        // Poll every second
        pollInterval = setInterval(pollResponse, 1000);
        pollResponse(); // Initial call
        
        return () => clearInterval(pollInterval);
    }, [taskId, isStreamComplete]);
    
    // Execute handler
    const handleExecute = useCallback(async (variables: Record<string, any>) => {
        setIsExecuting(true);
        setError(null);
        setResponse('');
        setIsStreamComplete(false);
        
        try {
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
            
            setTaskId(data.task_id);
            
        } catch (err) {
            console.error('Execution error:', err);
            setError({
                type: 'execution_error',
                message: err instanceof Error ? err.message : 'Unknown error occurred'
            });
        } finally {
            setIsExecuting(false);
        }
    }, [slug, fingerprint]);
    
    // Dynamically load custom component
    const CustomComponent = useMemo(() => {
        try {
            let processedCode = app.component_code;
            processedCode = processedCode.replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, '');
            processedCode = processedCode.replace(/^import\s+['"].*['"];?\s*$/gm, '');
            
            const { code } = transform(processedCode, {
                presets: ['react', 'typescript'],
                filename: 'custom-app.tsx'
            });
            
            const React = require('react');
            const { useState, useEffect, useMemo, useCallback } = React;
            const lucideReact = require('lucide-react');
            
            const allowedImports: Record<string, any> = {
                'react': React,
                'lucide-react': lucideReact,
            };
            
            if (app.allowed_imports.includes('lucide-react')) {
                Object.assign(allowedImports, lucideReact);
            }
            
            if (app.allowed_imports.includes('@/components/ui/button')) {
                const { Button } = require('@/components/ui/button');
                allowedImports['Button'] = Button;
            }
            if (app.allowed_imports.includes('@/components/ui/input')) {
                const { Input } = require('@/components/ui/input');
                allowedImports['Input'] = Input;
            }
            if (app.allowed_imports.includes('@/components/ui/textarea')) {
                const { Textarea } = require('@/components/ui/textarea');
                allowedImports['Textarea'] = Textarea;
            }
            if (app.allowed_imports.includes('@/components/ui/card')) {
                const cardExports = require('@/components/ui/card');
                Object.assign(allowedImports, cardExports);
            }
            if (app.allowed_imports.includes('@/components/ui/label')) {
                const { Label } = require('@/components/ui/label');
                allowedImports['Label'] = Label;
            }
            if (app.allowed_imports.includes('@/components/ui/select')) {
                const selectExports = require('@/components/ui/select');
                Object.assign(allowedImports, selectExports);
            }
            if (app.allowed_imports.includes('@/components/ui/slider')) {
                const { Slider } = require('@/components/ui/slider');
                allowedImports['Slider'] = Slider;
            }
            
            const componentFunction = new Function(
                'React',
                'useState',
                'useEffect',
                'useMemo',
                'useCallback',
                'EnhancedChatMarkdown',
                ...Object.keys(allowedImports),
                `
                ${code}
                
                return typeof exports !== 'undefined' && exports.default 
                    ? exports.default 
                    : (typeof Component !== 'undefined' ? Component : null);
                `
            );
            
            return componentFunction(
                React,
                useState,
                useEffect,
                useMemo,
                useCallback,
                EnhancedChatMarkdown,
                ...Object.values(allowedImports)
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
        <CustomComponent
            onExecute={handleExecute}
            response={response}
            isStreaming={!isStreamComplete && !!taskId}
            isExecuting={isExecuting}
            error={error}
            rateLimitInfo={rateLimitInfo}
        />
    );
}

