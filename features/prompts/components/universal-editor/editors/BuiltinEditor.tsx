'use client';

import React, { useState, useEffect } from 'react';
import { UniversalPromptEditor } from '../UniversalPromptEditor';
import { normalizePromptData, UniversalPromptData } from '../types';
import { toast } from 'sonner';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';

interface BuiltinEditorProps {
    /** Builtin ID to edit */
    builtinId: string;
    
    /** Whether the editor is open */
    isOpen: boolean;
    
    /** Callback when editor closes */
    onClose: () => void;
    
    /** Optional callback after successful save */
    onSaveSuccess?: () => void;
    
    /** Optional initial selection in editor */
    initialSelection?: any;
    
    /** Optional pre-loaded data (skips loading from API) */
    builtinData?: any;
    
    /** Optional pre-loaded models */
    models?: any[];
    
    /** Optional pre-loaded tools */
    tools?: any[];
}

/**
 * Ready-to-use Builtin Editor Component
 * 
 * Handles all CRUD operations for prompt_builtins table internally.
 * Just pass a builtin ID and it does everything.
 * 
 * @example
 * ```tsx
 * <BuiltinEditor
 *   builtinId={myBuiltinId}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSaveSuccess={() => console.log('Saved!')}
 * />
 * ```
 */
export function BuiltinEditor({
    builtinId,
    isOpen,
    onClose,
    onSaveSuccess,
    initialSelection,
    builtinData: preloadedBuiltinData,
    models: preloadedModels,
    tools: preloadedTools,
}: BuiltinEditorProps) {
    const [builtinData, setBuiltinData] = useState<UniversalPromptData | null>(null);
    const [models, setModels] = useState<any[]>(preloadedModels || []);
    const [tools, setTools] = useState<any[]>(preloadedTools || []);
    const [loading, setLoading] = useState(!preloadedBuiltinData);
    const [isSaving, setIsSaving] = useState(false);

    // Load all data when modal opens (only if not preloaded)
    useEffect(() => {
        if (isOpen && builtinId) {
            if (preloadedBuiltinData) {
                // Use preloaded data
                setBuiltinData(normalizePromptData(preloadedBuiltinData, 'builtin'));
                setLoading(false);
            } else {
                // Load from API
                loadData();
            }
        }
    }, [isOpen, builtinId, preloadedBuiltinData]);

    async function loadData() {
        try {
            setLoading(true);

            // Load in parallel
            const [modelsRes, toolsRes, builtinRes] = await Promise.all([
                fetch('/api/ai-models').then(r => r.json()).catch(() => ({ models: [] })),
                fetch('/api/tools').then(r => r.json()).catch(() => ({ tools: [] })),
                fetch(`/api/admin/prompt-builtins/${builtinId}`).then(r => r.json()),
            ]);

            setModels(modelsRes?.models || []);
            setTools(toolsRes?.tools || []);

            if (builtinRes && !builtinRes.error) {
                setBuiltinData(normalizePromptData(builtinRes, 'builtin'));
            } else {
                toast.error('Builtin not found');
                onClose();
            }
        } catch (error) {
            console.error('Failed to load builtin data:', error);
            toast.error('Failed to load builtin');
            onClose();
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(updated: UniversalPromptData) {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/admin/prompt-builtins/${builtinId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: updated.name,
                    description: updated.description,
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                    is_active: updated.is_active,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                const error = text ? JSON.parse(text) : {};
                throw new Error(error.error || `Failed to save builtin (${response.status})`);
            }

            toast.success('Builtin saved successfully');
            onSaveSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Save failed:', error);
            toast.error(error.message || 'Failed to save builtin');
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

    if (!builtinData) return null;

    return (
        <UniversalPromptEditor
            isOpen={isOpen}
            onClose={onClose}
            promptData={builtinData}
            models={models}
            availableTools={tools}
            onSave={handleSave}
            isSaving={isSaving}
            initialSelection={initialSelection}
        />
    );
}

