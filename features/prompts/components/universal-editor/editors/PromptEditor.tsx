'use client';

import React, { useState, useEffect } from 'react';
import { UniversalPromptEditor } from '../UniversalPromptEditor';
import { normalizePromptData, UniversalPromptData } from '../types';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';

interface PromptEditorProps {
    /** Prompt ID to edit */
    promptId: string;
    
    /** Whether the editor is open */
    isOpen: boolean;
    
    /** Callback when editor closes */
    onClose: () => void;
    
    /** Optional callback after successful save */
    onSaveSuccess?: () => void;
    
    /** Optional initial selection in editor */
    initialSelection?: any;
    
    /** Optional pre-loaded data (skips loading from API) */
    promptData?: any;
    
    /** Optional pre-loaded models */
    models?: any[];
    
    /** Optional pre-loaded tools */
    tools?: any[];
}

/**
 * Ready-to-use Prompt Editor Component
 * 
 * Handles all CRUD operations for prompts table internally.
 * Just pass a prompt ID and it does everything.
 * 
 * @example
 * ```tsx
 * <PromptEditor
 *   promptId={myPromptId}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSaveSuccess={() => console.log('Saved!')}
 * />
 * ```
 */
export function PromptEditor({
    promptId,
    isOpen,
    onClose,
    onSaveSuccess,
    initialSelection,
    promptData: preloadedPromptData,
    models: preloadedModels,
    tools: preloadedTools,
}: PromptEditorProps) {
    const [promptData, setPromptData] = useState<UniversalPromptData | null>(null);
    const [models, setModels] = useState<any[]>(preloadedModels || []);
    const [tools, setTools] = useState<any[]>(preloadedTools || []);
    const [loading, setLoading] = useState(!preloadedPromptData);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    // Load all data when modal opens (only if not preloaded)
    useEffect(() => {
        if (isOpen && promptId) {
            if (preloadedPromptData) {
                // Use preloaded data
                setPromptData(normalizePromptData(preloadedPromptData, 'prompt'));
                setLoading(false);
            } else {
                // Load from API
                loadData();
            }
        }
    }, [isOpen, promptId, preloadedPromptData]);

    async function loadData() {
        try {
            setLoading(true);

            // Load in parallel
            const [modelsRes, toolsRes, promptRes] = await Promise.all([
                fetch('/api/ai-models').then(r => r.json()).catch(() => ({ models: [] })),
                fetch('/api/tools').then(r => r.json()).catch(() => ({ tools: [] })),
                supabase.from('prompts').select('*').eq('id', promptId).single(),
            ]);

            setModels(modelsRes?.models || []);
            setTools(toolsRes?.tools || []);

            if (promptRes.data) {
                setPromptData(normalizePromptData(promptRes.data, 'prompt'));
            } else {
                toast.error('Prompt not found');
                onClose();
            }
        } catch (error) {
            console.error('Failed to load prompt data:', error);
            toast.error('Failed to load prompt');
            onClose();
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(updated: UniversalPromptData) {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('prompts')
                .update({
                    name: updated.name,
                    description: updated.description,
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                })
                .eq('id', promptId);

            if (error) throw error;

            toast.success('Prompt saved successfully');
            onSaveSuccess?.();
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Failed to save prompt');
        } finally {
            setIsSaving(false);
        }
    }

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <MatrxMiniLoader />
            </div>
        );
    }

    if (!promptData) return null;

    return (
        <UniversalPromptEditor
            isOpen={isOpen}
            onClose={onClose}
            promptData={promptData}
            models={models}
            availableTools={tools}
            onSave={handleSave}
            isSaving={isSaving}
            initialSelection={initialSelection}
        />
    );
}

