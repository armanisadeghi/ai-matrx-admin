'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ContextAwarePromptRunner } from '@/features/prompts/components/results-display/ContextAwarePromptRunner';
import { useCanvas } from '@/hooks/useCanvas';
import { getCodeEditorBuiltinId } from '@/features/code-editor/utils/codeEditorPrompts';
import { normalizeLanguage } from '@/features/code-editor/utils/languages';
import { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
import { applyCodeEdits } from '@/features/code-editor/utils/applyCodeEdits';
import { supabase } from '@/utils/supabase/client';
import { DYNAMIC_CONTEXT_VARIABLE } from '@/features/code-editor/utils/ContextVersionManager';
import type { PromptData } from '@/features/prompts/types/modal';

export interface ContextAwareCodeEditorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    code: string;
    language: string;
    builtinId?: string;
    promptContext?: 'prompt-app-ui' | 'generic';
    onCodeChange: (newCode: string, version: number) => void;
    selection?: string;
    context?: string;
    title?: string;
}

/**
 * ContextAwareCodeEditorModal (V3)
 * 
 * Advanced code editor with dynamic context version management.
 * 
 * Key features:
 * - Maintains versioned code context
 * - Injects only current version per message
 * - Replaces old versions with tombstones
 * - Prevents context window bloat
 * - Supports unlimited edit iterations
 * 
 * Requirements:
 * - Builtin prompt MUST have a `dynamic_context` variable
 * - This signals the system to use version management
 * 
 * Flow:
 * 1. User describes changes
 * 2. AI responds with edits (using current code from `dynamic_context`)
 * 3. Canvas shows diff preview
 * 4. User applies → version increments, old version tombstoned
 * 5. Repeat infinitely without context bloat!
 */
export function ContextAwareCodeEditorModal({
    open,
    onOpenChange,
    code,
    language: rawLanguage,
    builtinId,
    promptContext = 'generic',
    onCodeChange,
    selection,
    context,
    title = 'AI Code Editor (Context-Aware)',
}: ContextAwareCodeEditorModalProps) {
    const { open: openCanvas, close: closeCanvas } = useCanvas();
    
    const [promptData, setPromptData] = useState<PromptData | null>(null);
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
    
    const language = normalizeLanguage(rawLanguage);
    const currentCodeRef = useRef(code);
    const updateContextRef = useRef<((content: string, summary?: string) => void) | null>(null);
    const defaultBuiltinId = builtinId || getCodeEditorBuiltinId(promptContext);
    
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
                    // Update the code in parent component
                    // The version is managed by ContextVersionManager
                    onCodeChange(newCode, 0); // Version will be tracked internally
                    
                    // Update our ref so next edits work on the new code
                    currentCodeRef.current = newCode;
                    
                    // Call the context update function to increment version
                    if (updateContextRef.current) {
                        updateContextRef.current(newCode, parsed.explanation || 'Applied code edits');
                    }
                    
                    // Close canvas but keep conversation open
                    closeCanvas();
                },
                onDiscard: () => {
                    // Just close canvas, keep conversation open
                    closeCanvas();
                },
            },
            metadata: {
                title: 'Code Preview',
            },
        });
    }, [language, openCanvas, closeCanvas, onCodeChange]);
    
    // Handle context version changes
    const handleContextChange = useCallback((newContent: string, version: number) => {
        console.log(`✅ Context updated to v${version}`);
        // The ContextVersionManager handles the version tracking
    }, []);
    
    // Receive the updateContext function from ContextAwarePromptRunner
    const handleContextUpdateReady = useCallback((updateFn: (content: string, summary?: string) => void) => {
        updateContextRef.current = updateFn;
        console.log('✅ Context update function ready');
    }, []);
    
    if (!open) return null;
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0">
                {isLoadingPrompt ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-muted-foreground">Loading prompt...</div>
                        </div>
                    </div>
                ) : promptData ? (
                    <ContextAwarePromptRunner
                        initialContext={code}
                        contextType="code"
                        contextLanguage={language}
                        promptData={promptData}
                        staticVariables={{
                            ...(selection && { selection }),
                            ...(context && { context }),
                        }}
                        executionConfig={{
                            auto_run: false,
                            allow_chat: true,
                            show_variables: false,
                            apply_variables: true,
                        }}
                        onResponseComplete={handleResponseComplete}
                        onContextChange={handleContextChange}
                        onContextUpdateReady={handleContextUpdateReady}
                        title={title}
                        onClose={() => onOpenChange(false)}
                        isActive={open}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                            Failed to load prompt
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

