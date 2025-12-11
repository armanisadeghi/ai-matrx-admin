'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { ContextAwarePromptCompactModal } from '@/features/prompts/components/results-display/ContextAwarePromptCompactModal';
import { useCanvas } from '@/features/canvas/hooks/useCanvas';
import { getBuiltinId } from '@/lib/redux/prompt-execution/builtins';
import { normalizeLanguage } from '@/features/code-editor/config/languages';
import { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
import { applyCodeEdits } from '@/features/code-editor/utils/applyCodeEdits';
import { getDiffStats } from '@/features/code-editor/utils/generateDiff';
import { supabase } from '@/utils/supabase/client';
import { DYNAMIC_CONTEXT_VARIABLE } from '@/features/code-editor/utils/ContextVersionManager';
import type { PromptData } from '@/features/prompts/types/core';

export interface ContextAwareCodeEditorCompactProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    code: string;
    language: string;
    builtinId?: string;
    promptKey?: 'prompt-app-ui-editor' | 'generic-code-editor' | 'code-editor-dynamic-context';
    onCodeChange: (newCode: string, version: number) => void;
    selection?: string;
    context?: string;
    title?: string;
    customMessage?: string;
    countdownSeconds?: number;
}

/**
 * ContextAwareCodeEditorCompact (V3 Compact)
 * 
 * Code editor in a compact, draggable modal with full V3 features.
 * 
 * Perfect for editing code while viewing the source - non-intrusive!
 * 
 * Features:
 * - Compact draggable modal
 * - Side-by-side canvas when edits are made
 * - Full V3 context management
 * - Multi-turn editing
 * - Success states
 * - Can see source code while editing!
 */
export function ContextAwareCodeEditorCompact({
    open,
    onOpenChange,
    code,
    language: rawLanguage,
    builtinId,
    promptKey = 'generic-code-editor',
    onCodeChange,
    selection,
    context,
    title = 'AI Code Editor (Compact)',
    customMessage,
    countdownSeconds,
}: ContextAwareCodeEditorCompactProps) {
    const { open: openCanvas, close: closeCanvas } = useCanvas();
    
    const [promptData, setPromptData] = useState<PromptData | null>(null);
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
    
    const language = normalizeLanguage(rawLanguage);
    const currentCodeRef = useRef(code);
    const currentVersionRef = useRef(1);
    const updateContextRef = useRef<((content: string, summary?: string) => void) | null>(null);
    const defaultBuiltinId = builtinId || getBuiltinId(promptKey);
    
    useEffect(() => {
        currentCodeRef.current = code;
    }, [code]);
    
    // Fetch builtin prompt when modal opens
    useEffect(() => {
        if (open && !promptData) {
            setIsLoadingPrompt(true);
            
            (async () => {
                try {
                    const { data: prompt, error } = await supabase
                        .from('prompt_builtins')
                        .select('*')
                        .eq('id', defaultBuiltinId)
                        .single();
                    
                    if (error || !prompt) {
                        console.error('Failed to fetch builtin prompt:', error?.message);
                        return;
                    }
                    
                    const normalizedData: PromptData = {
                        id: prompt.id,
                        name: prompt.name,
                        description: prompt.description,
                        messages: prompt.messages,
                        variableDefaults: prompt.variable_defaults || [],
                        settings: prompt.settings || {},
                    };
                    
                    // Validate that prompt has dynamic_context variable
                    const hasDynamicContext = normalizedData.variableDefaults?.some(
                        v => v.name === DYNAMIC_CONTEXT_VARIABLE
                    );
                    
                    if (!hasDynamicContext) {
                        console.warn(
                            `⚠️  Prompt "${normalizedData.name}" doesn't have "${DYNAMIC_CONTEXT_VARIABLE}" variable.`,
                            `Context versioning will not work. Please add this variable to the prompt.`
                        );
                    }
                    
                    setPromptData(normalizedData);
                } catch (err) {
                    console.error('Error loading builtin prompt:', err);
                } finally {
                    setIsLoadingPrompt(false);
                }
            })();
        }
    }, [open, defaultBuiltinId, promptData]);
    
    // Reset when modal closes
    useEffect(() => {
        if (!open) {
            setPromptData(null);
            closeCanvas();
        }
    }, [open, closeCanvas]);
    
    const handleResponseComplete = useCallback((result: any) => {
        const { response } = result;
        
        if (!response) return;
        
        // Try to parse code edits from the response
        const parsed = parseCodeEdits(response);
        
        // No edits found - just continue the conversation
        if (!parsed.success || parsed.edits.length === 0) {
            return;
        }
        
        // Validate edits against current code
        const validation = validateEdits(currentCodeRef.current, parsed.edits);
        
        if (!validation.valid) {
            // Show validation errors in canvas
            openCanvas({
                type: 'code_edit_error',
                data: {
                    errors: validation.errors,
                    warnings: validation.warnings,
                    rawResponse: response,
                    onClose: () => closeCanvas(),
                },
                metadata: {
                    title: 'Code Edit Error',
                },
            });
            return;
        }
        
        // Apply edits to generate preview
        const result_apply = applyCodeEdits(currentCodeRef.current, parsed.edits);
        
        if (!result_apply.success) {
            // Show application errors in canvas
            openCanvas({
                type: 'code_edit_error',
                data: {
                    errors: result_apply.errors,
                    warnings: result_apply.warnings || [],
                    rawResponse: response,
                    onClose: () => closeCanvas(),
                },
                metadata: {
                    title: 'Code Edit Error',
                },
            });
            return;
        }
        
        const newCode = result_apply.code || '';
        
        // Get diff stats for the title
        const diffStats = getDiffStats(currentCodeRef.current, newCode);
        
        // Build rich title with badges and colors
        const editsCount = parsed.edits.length;
        const titleNode = (
            <>
                <span className="truncate">Code Preview</span>
                {editsCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                        {editsCount} edit{editsCount !== 1 ? 's' : ''}
                    </Badge>
                )}
                {diffStats && (
                    <>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30 font-normal">
                            +{diffStats.additions}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30 font-normal">
                            -{diffStats.deletions}
                        </Badge>
                    </>
                )}
            </>
        );
        
        // Success! Open canvas with code preview
        openCanvas({
            type: 'code_preview',
            data: {
                originalCode: currentCodeRef.current,
                modifiedCode: newCode,
                language,
                edits: parsed.edits,
                explanation: parsed.explanation,
                onApply: () => {
                    // Increment version BEFORE calling onCodeChange
                    const nextVersion = currentVersionRef.current + 1;
                    currentVersionRef.current = nextVersion;
                    
                    // Call the context update function to add tombstone for old version
                    if (updateContextRef.current) {
                        updateContextRef.current(newCode, parsed.explanation || 'Applied code edits');
                    }
                    
                    // Update our ref so next edits work on the new code
                    currentCodeRef.current = newCode;
                    
                    // Update the code in parent component with the NEW version
                    onCodeChange(newCode, nextVersion);
                    
                    // Canvas will show success state with options to close or continue
                },
                onDiscard: () => {
                    // Just close canvas, keep conversation open
                    closeCanvas();
                },
                onCloseModal: () => {
                    // Close the compact modal so user can see their updated code
                    onOpenChange(false);
                },
            },
            metadata: {
                title: titleNode as ReactNode,
                subtitle: parsed.explanation && parsed.explanation.length < 100 ? parsed.explanation : undefined,
            },
        });
    }, [language, openCanvas, closeCanvas, onCodeChange, onOpenChange]);
    
    // Handle context version changes (for logging/verification)
    const handleContextChange = useCallback((newContent: string, version: number) => {
        // Note: We manage version in onApply, this is just for logging
    }, []);
    
    // Receive the updateContext function from ContextAwarePromptRunner
    const handleContextUpdateReady = useCallback((updateFn: (content: string, summary?: string) => void) => {
        updateContextRef.current = updateFn;
    }, []);
    
    if (!open) return null;
    
    // Show loading state or the compact modal
    if (isLoadingPrompt || !promptData) {
        return null; // Could show a loading indicator if needed
    }
    
    return (
        <ContextAwarePromptCompactModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            promptData={promptData}
            executionConfig={{
                auto_run: false,
                allow_chat: true,
                show_variables: false,
                apply_variables: true,
                track_in_runs: true,
                use_pre_execution_input: false,
            }}
            initialContext={code}
            contextType="code"
            contextLanguage={language}
            staticVariables={{
                ...(selection && { selection }),
                ...(context && { context }),
            }}
            title={title}
            onResponseComplete={handleResponseComplete}
            onContextChange={handleContextChange}
            onContextUpdateReady={handleContextUpdateReady}
            customMessage={customMessage}
            countdownSeconds={countdownSeconds}
        />
    );
}

