'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PromptBuilder } from '@/features/prompts/components/builder/PromptBuilder';
import type { PromptMessage, PromptVariable } from '@/features/prompts/types/core';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BuiltinEditorWrapperProps {
    builtinId: string;
    models: any[];
    initialData: {
        id?: string;
        name?: string;
        messages?: PromptMessage[];
        variableDefaults?: PromptVariable[];
        settings?: Record<string, any>;
        tags?: string[];
        category?: string;
        isFavorite?: boolean;
        isArchived?: boolean;
        modelId?: string;
        outputFormat?: string;
        outputSchema?: unknown;
        description?: string;
    };
    availableTools?: any[];
}

export function BuiltinEditorWrapper({
    builtinId,
    models,
    initialData,
    availableTools,
}: BuiltinEditorWrapperProps) {
    const router = useRouter();

    const handleBuiltinSave = async (data: {
        id?: string;
        name: string;
        messages: PromptMessage[];
        variableDefaults: PromptVariable[];
        settings: Record<string, unknown>;
    }) => {
        const response = await fetch(`/api/admin/prompt-builtins/${builtinId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: data.name,
                description: initialData.description,
                messages: data.messages,
                variable_defaults: data.variableDefaults,
                settings: data.settings,
                tags: initialData.tags,
                category: initialData.category,
                model_id: (data.settings.model_id as string) ?? initialData.modelId,
                is_favorite: initialData.isFavorite,
                is_archived: initialData.isArchived,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error((err as { error?: string }).error || `Failed to save builtin (${response.status})`);
        }

        toast.success('Builtin saved successfully');
    };

    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            <div className="border-b px-4 bg-card flex items-center gap-3 h-10 shrink-0">
                <Link
                    href="/administration/prompt-builtins/builtins"
                    className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Builtins
                </Link>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-sm text-muted-foreground">
                    Editing Builtin: <span className="text-foreground font-medium">{initialData.name || 'Untitled'}</span>
                </span>
            </div>
            <div className="flex-1 overflow-hidden">
                <PromptBuilder
                    models={models}
                    initialData={initialData}
                    availableTools={availableTools}
                    onCustomSave={handleBuiltinSave}
                    contextLabel="Prompt Builtins"
                />
            </div>
        </div>
    );
}
