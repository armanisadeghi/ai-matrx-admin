'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FullScreenEditor } from '../FullScreenEditor';
import { UniversalPromptEditorProps, UniversalPromptData } from './types';
import { PromptMessage, PromptVariable, VariableCustomComponent, PromptSettings } from '@/features/prompts/types/core';
import { useModelControls, getModelDefaults } from '@/features/prompts/hooks/useModelControls';
import { sanitizeVariableName } from '@/features/prompts/utils/variable-utils';
import { UnsavedChangesAlert } from '@/components/ui/unsaved-changes-alert';

/**
 * UniversalPromptEditor - A self-contained prompt editor that works with
 * prompts, templates, and builtins tables.
 * 
 * This component manages all editing state internally and uses the existing
 * FullScreenEditor for the UI. It provides a simple save/cancel API.
 * 
 * @example
 * ```tsx
 * <UniversalPromptEditor
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   promptData={myPromptData}
 *   models={models}
 *   availableTools={tools}
 *   onSave={async (updated) => {
 *     await updatePromptInDatabase(updated);
 *     setIsOpen(false);
 *   }}
 * />
 * ```
 */
export function UniversalPromptEditor({
    isOpen,
    onClose,
    promptData,
    models,
    availableTools = [],
    onSave,
    isSaving = false,
    initialSelection = null,
}: UniversalPromptEditorProps) {
    // Separate system message from other messages
    const getSystemMessage = useCallback(() => {
        const systemMsg = promptData.messages.find(m => m.role === 'system');
        return systemMsg?.content || '';
    }, [promptData.messages]);

    const getRegularMessages = useCallback(() => {
        return promptData.messages.filter(m => m.role !== 'system');
    }, [promptData.messages]);

    // Initialize model
    const getInitialModel = useCallback(() => {
        if (promptData.settings?.model_id) {
            return promptData.settings.model_id;
        }
        // Fallback to first available model
        return models[0]?.id || '';
    }, [promptData.settings, models]);

    // State management
    const [developerMessage, setDeveloperMessage] = useState(getSystemMessage());
    const [messages, setMessages] = useState<PromptMessage[]>(getRegularMessages());
    const [model, setModel] = useState<string>(getInitialModel());
    const [modelConfig, setModelConfig] = useState<PromptSettings>(() => {
        const initialModel = models.find(m => m.id === getInitialModel());
        const defaults = getModelDefaults(initialModel || models[0]);
        const { model_id, ...config } = promptData.settings || {};
        return { ...defaults, ...config };
    });
    const [variableDefaults, setVariableDefaults] = useState<PromptVariable[]>(
        promptData.variable_defaults || []
    );
    const [isDirty, setIsDirty] = useState(false);
    const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

    // Reset state when promptData changes
    useEffect(() => {
        if (isOpen) {
            setDeveloperMessage(getSystemMessage());
            setMessages(getRegularMessages());
            setModel(getInitialModel());

            const initialModel = models.find(m => m.id === getInitialModel());
            const defaults = getModelDefaults(initialModel || models[0]);
            const { model_id, ...config } = promptData.settings || {};
            setModelConfig({ ...defaults, ...config });

            setVariableDefaults(promptData.variable_defaults || []);
            setIsDirty(false);
        }
    }, [isOpen, promptData, models, getSystemMessage, getRegularMessages, getInitialModel]);

    // Get model capabilities
    const { normalizedControls } = useModelControls(models, model);
    const modelSupportsTools = normalizedControls?.tools?.default ?? false;

    // Handle model change
    const handleModelChange = useCallback((newModelId: string) => {
        const newModel = models.find(m => m.id === newModelId);
        if (newModel) {
            setModel(newModelId);
            // Merge new model defaults with existing config
            const newDefaults = getModelDefaults(newModel);
            setModelConfig(prev => ({ ...newDefaults, ...prev }));
            setIsDirty(true);
        }
    }, [models]);

    // Handle model config change
    const handleModelConfigChange = useCallback((config: PromptSettings) => {
        setModelConfig(config);
        setIsDirty(true);
    }, []);

    // Handle message changes
    const handleMessageContentChange = useCallback((index: number, content: string) => {
        setMessages(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], content };
            return updated;
        });
        setIsDirty(true);
    }, []);

    const handleMessageRoleChange = useCallback((index: number, role: string) => {
        setMessages(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], role };
            return updated;
        });
        setIsDirty(true);
    }, []);

    const handleAddMessage = useCallback(() => {
        setMessages(prev => [...prev, { role: 'user', content: '' }]);
        setIsDirty(true);
    }, []);

    // Handle variable changes
    const handleAddVariable = useCallback((
        name: string,
        defaultValue: string,
        customComponent?: VariableCustomComponent,
        required?: boolean,
        helpText?: string
    ) => {
        const sanitizedName = sanitizeVariableName(name);
        if (!sanitizedName) return;

        setVariableDefaults(prev => {
            // Check for duplicates
            if (prev.some(v => v.name === sanitizedName)) return prev;
            return [...prev, { name: sanitizedName, defaultValue, customComponent, required, helpText }];
        });
        setIsDirty(true);
    }, []);

    const handleUpdateVariable = useCallback((
        originalName: string,
        newName: string,
        defaultValue: string,
        customComponent?: VariableCustomComponent,
        required?: boolean,
        helpText?: string
    ) => {
        setVariableDefaults(prev =>
            prev.map(v =>
                v.name === originalName
                    ? { name: newName, defaultValue, customComponent, required, helpText }
                    : v
            )
        );
        setIsDirty(true);
    }, []);

    const handleRemoveVariable = useCallback((variableName: string) => {
        setVariableDefaults(prev => prev.filter(v => v.name !== variableName));
        setIsDirty(true);
    }, []);

    // Handle tool changes
    const handleAddTool = useCallback((toolName: string) => {
        setModelConfig(prev => ({
            ...prev,
            tools: [...(prev.tools || []), toolName],
        }));
        setIsDirty(true);
    }, []);

    const handleRemoveTool = useCallback((toolName: string) => {
        setModelConfig(prev => ({
            ...prev,
            tools: (prev.tools || []).filter(t => t !== toolName),
        }));
        setIsDirty(true);
    }, []);

    // Handle developer message change
    const handleDeveloperMessageChange = useCallback((content: string) => {
        setDeveloperMessage(content);
        setIsDirty(true);
    }, []);

    // Handle save
    const handleSave = useCallback(async () => {
        // Reconstruct the full messages array (system + regular messages)
        const fullMessages: PromptMessage[] = [
            { role: 'system', content: developerMessage },
            ...messages,
        ];

        // Build updated prompt data
        const updatedPrompt: UniversalPromptData = {
            ...promptData,
            messages: fullMessages,
            variable_defaults: variableDefaults,
            tools: modelConfig.tools || [],
            settings: {
                ...modelConfig,
                model_id: model,
            },
        };

        // Call the save callback
        await onSave(updatedPrompt);
        setIsDirty(false);
    }, [
        promptData,
        developerMessage,
        messages,
        variableDefaults,
        modelConfig,
        model,
        onSave,
    ]);

    // Handle close with dirty check
    const handleClose = useCallback(() => {
        if (isDirty) {
            setShowUnsavedAlert(true);
            return;
        }
        onClose();
    }, [isDirty, onClose]);

    return (
        <>
            <FullScreenEditor
                isOpen={isOpen}
                onClose={handleClose}
                developerMessage={developerMessage}
                onDeveloperMessageChange={handleDeveloperMessageChange}
                messages={messages}
                onMessageContentChange={handleMessageContentChange}
                onMessageRoleChange={handleMessageRoleChange}
                initialSelection={initialSelection}
                onAddMessage={handleAddMessage}
                model={model}
                models={models}
                modelConfig={modelConfig}
                onModelChange={handleModelChange}
                onModelConfigChange={handleModelConfigChange}
                variableDefaults={variableDefaults}
                onAddVariable={handleAddVariable}
                onUpdateVariable={handleUpdateVariable}
                onRemoveVariable={handleRemoveVariable}
                selectedTools={modelConfig.tools || []}
                availableTools={availableTools}
                onAddTool={handleAddTool}
                onRemoveTool={handleRemoveTool}
                modelSupportsTools={modelSupportsTools}
                onSave={handleSave}
                isSaving={isSaving}
                isDirty={isDirty}
            />
            <UnsavedChangesAlert
                open={showUnsavedAlert}
                onOpenChange={setShowUnsavedAlert}
                onViewChanges={() => setShowUnsavedAlert(false)}
                onContinue={() => {
                    setShowUnsavedAlert(false);
                    onClose();
                }}
                unsavedItemsCount={1}
            />
        </>
    );
}

