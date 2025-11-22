'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePromptRunner } from '@/features/prompts/hooks/usePromptRunner';
import { useCanvas } from '@/hooks/useCanvas';
import { getCodeEditorBuiltinId } from '@/features/code-editor/utils/codeEditorPrompts';
import { normalizeLanguage } from '@/features/code-editor/utils/languages';
import { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
import { applyCodeEdits } from '@/features/code-editor/utils/applyCodeEdits';
import { supabase } from '@/utils/supabase/client';
import type { PromptData } from '@/features/prompts/types/modal';

/**
 * AICodeEditorModalV2
 * 
 * Code editor that leverages existing prompt runner infrastructure.
 * Supports multi-turn conversations with automatic code edit detection.
 * 
 * Flow:
 * 1. User describes changes
 * 2. AI responds with edits
 * 3. Canvas opens with diff preview
 * 4. User applies changes
 * 5. Conversation continues with updated code
 * 6. Repeat
 */

export interface AICodeEditorModalV2Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentCode: string;
    language: string;
    builtinId?: string;
    promptContext?: 'prompt-app-ui' | 'generic';
    onCodeChange: (newCode: string) => void;
    selection?: string;
    context?: string;
    title?: string;
    description?: string;
    allowPromptSelection?: boolean;
}


export function AICodeEditorModalV2({
    open,
    onOpenChange,
    currentCode,
    language: rawLanguage,
    builtinId,
    promptContext = 'generic',
    onCodeChange,
    selection,
    context,
}: AICodeEditorModalV2Props) {
    const { openPrompt, closePrompt } = usePromptRunner();
    const { open: openCanvas, close: closeCanvas } = useCanvas();
    
    const [promptData, setPromptData] = useState<PromptData | null>(null);
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    
    const language = normalizeLanguage(rawLanguage);
    const currentCodeRef = useRef(currentCode);
    const defaultBuiltinId = builtinId || getCodeEditorBuiltinId(promptContext);
    
    useEffect(() => {
        currentCodeRef.current = currentCode;
    }, [currentCode]);
    
    // Fetch builtin prompt when modal opens
    useEffect(() => {
        if (open && !promptData && !hasOpened) {
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
                    
                    setPromptData(normalizedData);
                } catch (err) {
                    console.error('Error loading builtin prompt:', err);
                } finally {
                    setIsLoadingPrompt(false);
                }
            })();
        }
    }, [open, defaultBuiltinId, promptData]);
    
    // Open the prompt runner when prompt data is loaded
    useEffect(() => {
        if (open && promptData && !isLoadingPrompt && !hasOpened) {
            setHasOpened(true);
            
            (async () => {
                try {
                    await openPrompt({
                        promptData,
                        result_display: 'modal-full',
                        executionConfig: {
                            auto_run: false,
                            allow_chat: true,
                            show_variables: false,
                            apply_variables: true,
                        },
                        variables: {
                            current_code: currentCode,
                            content: currentCode,
                            ...(selection && { selection }),
                            ...(context && { context }),
                        },
                        onExecutionComplete: (result) => {
                            handleExecutionComplete(result);
                        },
                    });
                } catch (error) {
                    console.error('Error opening prompt:', error);
                }
            })();
        }
    }, [open, promptData, isLoadingPrompt, hasOpened]);
    
    // Reset when modal closes
    useEffect(() => {
        if (!open) {
            setPromptData(null);
            setHasOpened(false);
            closePrompt();
            closeCanvas();
        }
    }, [open, closePrompt, closeCanvas]);
    
    const handleExecutionComplete = useCallback((result: any) => {
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
                    onCodeChange(newCode);
                    
                    // Update our ref so next edits work on the new code
                    currentCodeRef.current = newCode;
                    
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
    
    // This modal is just a trigger - the actual UI is handled by usePromptRunner
    // which shows its own modal
    return null;
}

