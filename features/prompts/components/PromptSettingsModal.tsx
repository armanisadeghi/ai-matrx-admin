"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyTextarea, Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Info, FileJson, Settings2, WrapText, Variable, Plus } from "lucide-react";
import { PromptVariable } from "./PromptBuilder";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { VariablesManager } from "./configuration/VariablesManager";
import { VariableEditorModal } from "./configuration/VariableEditorModal";
import { VariableCustomComponent } from "../types/variable-components";

interface PromptSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptId?: string;
    promptName: string;
    promptDescription?: string;
    variableDefaults: PromptVariable[];
    messages: PromptMessage[];
    settings: Record<string, any>;
    models: any[];
    onUpdate: (id: string, data: { name: string; description?: string; variableDefaults: PromptVariable[] }) => void;
    onLocalStateUpdate: (updates: { name?: string; description?: string; variableDefaults?: PromptVariable[] }) => void;
}

export function PromptSettingsModal({
    isOpen,
    onClose,
    promptId,
    promptName,
    promptDescription = "",
    variableDefaults,
    messages,
    settings,
    models,
    onUpdate,
    onLocalStateUpdate,
}: PromptSettingsModalProps) {
    const [localName, setLocalName] = useState(promptName);
    const [localDescription, setLocalDescription] = useState(promptDescription);
    const [localVariables, setLocalVariables] = useState<PromptVariable[]>([...variableDefaults]);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [wrapJson, setWrapJson] = useState(false);
    
    // Variable editor modal state
    const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
    const [variableModalMode, setVariableModalMode] = useState<'add' | 'edit'>('add');
    const [editingVariable, setEditingVariable] = useState<PromptVariable | undefined>(undefined);

    // Reset local state when modal opens or props change
    useEffect(() => {
        if (isOpen) {
            setLocalName(promptName);
            setLocalDescription(promptDescription);
            setLocalVariables([...variableDefaults]);
        }
    }, [isOpen, promptName, promptDescription, variableDefaults]);

    // Build the complete prompt object
    const promptObject = useMemo(() => {
        return {
            id: promptId,
            name: localName,
            description: localDescription,
            messages,
            variableDefaults: localVariables,
            settings,
        };
    }, [promptId, localName, localDescription, messages, localVariables, settings]);

    const handleVariableDefaultChange = (index: number, value: string) => {
        const updated = [...localVariables];
        updated[index] = { ...updated[index], defaultValue: value };
        setLocalVariables(updated);
    };

    const handleAddVariable = (name: string, customComponent?: VariableCustomComponent) => {
        // Don't add duplicates
        if (localVariables.some(v => v.name === name)) {
            return;
        }
        setLocalVariables([...localVariables, { name, defaultValue: "", customComponent }]);
    };

    const handleUpdateVariable = (name: string, customComponent?: VariableCustomComponent) => {
        setLocalVariables(prev =>
            prev.map(v => v.name === name ? { ...v, customComponent } : v)
        );
    };

    const handleRemoveVariable = (name: string) => {
        setLocalVariables(prev => prev.filter(v => v.name !== name));
    };

    const handleOpenAddVariable = () => {
        setVariableModalMode('add');
        setEditingVariable(undefined);
        setIsVariableModalOpen(true);
    };

    const handleOpenEditVariable = (variable: PromptVariable) => {
        setVariableModalMode('edit');
        setEditingVariable(variable);
        setIsVariableModalOpen(true);
    };

    const handleVariableModalSave = (name: string, customComponent?: VariableCustomComponent) => {
        if (variableModalMode === 'add') {
            handleAddVariable(name, customComponent);
        } else if (editingVariable) {
            handleUpdateVariable(editingVariable.name, customComponent);
        }
        setIsVariableModalOpen(false);
    };

    const handleCopyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(promptObject, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const handleSave = async () => {
        if (!promptId) return;

        setIsSaving(true);
        try {
            const updateData = {
                name: localName.trim(),
                description: localDescription.trim(),
                variableDefaults: localVariables,
            };

            // Update the database
            onUpdate(promptId, updateData);

            // Update local state in PromptBuilder
            onLocalStateUpdate(updateData);

            onClose();
        } catch (error) {
            console.error("Error saving prompt settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        setLocalName(promptName);
        setLocalDescription(promptDescription);
        setLocalVariables([...variableDefaults]);
        onClose();
    };

    // Get model name from settings
    const selectedModel = models.find(m => m.id === settings?.model_id);
    const modelName = selectedModel?.common_name || selectedModel?.name || "Unknown";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[95vh] flex flex-col bg-textured p-0">
                <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Prompt Settings
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="mx-4 mt-3 grid w-auto grid-cols-5 gap-1 bg-gray-100 dark:bg-gray-800">
                        <TabsTrigger value="overview" className="text-xs sm:text-sm">
                            <Info className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="variables" className="text-xs sm:text-sm">
                            <Variable className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Variables
                        </TabsTrigger>
                        <TabsTrigger value="messages" className="text-xs sm:text-sm">
                            <FileJson className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Messages
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="text-xs sm:text-sm">
                            <Settings2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Settings
                        </TabsTrigger>
                        <TabsTrigger value="json" className="text-xs sm:text-sm">
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            JSON
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden px-4 pb-4">
                        <TabsContent value="overview" className="h-full overflow-y-auto mt-3 space-y-3">
                            {/* Basic Info */}
                            <Card className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Basic Information</h3>
                                <div className="space-y-2">
                                    <div>
                                        <Label htmlFor="prompt-name" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Name
                                        </Label>
                                        <CopyInput
                                            id="prompt-name"
                                            value={localName}
                                            onChange={(e) => setLocalName(e.target.value)}
                                            placeholder="Enter prompt name..."
                                            className="mt-1 h-8 text-sm bg-gray-50 dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="prompt-description" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Description
                                        </Label>
                                        <CopyTextarea
                                            id="prompt-description"
                                            value={localDescription}
                                            onChange={(e) => setLocalDescription(e.target.value)}
                                            placeholder="Describe what this prompt does..."
                                            className="mt-1 text-sm bg-gray-50 dark:bg-gray-700 min-h-[60px]"
                                            rows={2}
                                        />
                                    </div>
                                    {promptId && (
                                        <div>
                                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">ID</Label>
                                            <CopyInput
                                                value={promptId}
                                                readOnly
                                                className="mt-1 h-8 text-xs font-mono bg-gray-50 dark:bg-gray-700"
                                            />
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Quick Stats */}
                            <Card className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick Stats</h3>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                        <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{messages.length}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                        <span className="text-gray-600 dark:text-gray-400">Variables:</span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{localVariables.length}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded col-span-2">
                                        <span className="text-gray-600 dark:text-gray-400">Model:</span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{modelName}</span>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="variables" className="h-full overflow-y-auto mt-3">
                            <div className="space-y-4">
                                {/* Add New Variable Button */}
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Variables</h3>
                                    <Button
                                        size="sm"
                                        onClick={handleOpenAddVariable}
                                        className="h-7 text-xs"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        Add Variable
                                    </Button>
                                </div>

                                {/* Variables List */}
                                {localVariables.length === 0 ? (
                                    <Card className="p-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No variables defined</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                Click "Add Variable" to create your first variable
                                            </p>
                                        </div>
                                    </Card>
                                ) : (
                                    localVariables.map((variable, index) => (
                                        <Card key={index} className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                            <div className="space-y-3">
                                                {/* Name */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Name</Label>
                                                        <button
                                                            onClick={() => handleRemoveVariable(variable.name)}
                                                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <CopyInput
                                                        value={variable.name}
                                                        readOnly
                                                        className="h-8 text-sm bg-gray-50 dark:bg-gray-700 font-mono"
                                                    />
                                                </div>

                                                {/* Default Value */}
                                                <div>
                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                                        Default Value
                                                    </Label>
                                                    <Textarea
                                                        value={variable.defaultValue}
                                                        onChange={(e) => handleVariableDefaultChange(index, e.target.value)}
                                                        placeholder={`Default value for {{${variable.name}}}...`}
                                                        className="text-sm bg-gray-50 dark:bg-gray-700 min-h-[60px]"
                                                        rows={2}
                                                    />
                                                </div>

                                                {/* Input Type & Configuration */}
                                                <div>
                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                                        Input Type
                                                    </Label>
                                                    <button
                                                        onClick={() => handleOpenEditVariable(variable)}
                                                        className="w-full h-8 px-3 text-left text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
                                                    >
                                                        <span>{variable.customComponent?.type || 'textarea'}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Click to configure</span>
                                                    </button>
                                                    {variable.customComponent && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {variable.customComponent.type === 'toggle' && `Values: ${variable.customComponent.toggleValues?.join(' / ') || 'No / Yes'}`}
                                                            {variable.customComponent.type === 'number' && `Range: ${variable.customComponent.min ?? 'any'} - ${variable.customComponent.max ?? 'any'}`}
                                                            {(variable.customComponent.type === 'radio' || variable.customComponent.type === 'checkbox' || variable.customComponent.type === 'select') && 
                                                                `Options: ${variable.customComponent.options?.length || 0} defined${variable.customComponent.allowOther ? ' + Other' : ''}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}

                            </div>
                        </TabsContent>

                        <TabsContent value="messages" className="h-full overflow-y-auto mt-3 space-y-2">
                            {messages.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No messages defined</p>
                            ) : (
                                messages.map((message, index) => (
                                    <Card key={index} className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                                message.role === 'system' 
                                                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                                    : message.role === 'user'
                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                                    : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                            }`}>
                                                {message.role}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {message.content.length} chars
                                            </span>
                                        </div>
                                        <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                            {message.content || "(empty)"}
                                        </pre>
                                    </Card>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="settings" className="h-full overflow-y-auto mt-3">
                            <Card className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Model Configuration</h3>
                                <div className="space-y-2">
                                    {Object.entries(settings || {}).map(([key, value]) => (
                                        <div key={key} className="p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono">
                                                    {key}:
                                                </span>
                                                <span className="text-xs text-gray-900 dark:text-gray-100 text-right break-all">
                                                    {key === 'model_id' 
                                                        ? `${modelName} (${value})`
                                                        : typeof value === 'object' 
                                                        ? JSON.stringify(value)
                                                        : String(value)
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="json" className="h-full overflow-y-auto mt-3">
                            <Card className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Complete Prompt Object</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setWrapJson(!wrapJson)}
                                            className="h-7 text-xs"
                                        >
                                            <WrapText className="w-3 h-3 mr-1" />
                                            {wrapJson ? "No Wrap" : "Wrap"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopyJSON}
                                            className="h-7 text-xs"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    Copy JSON
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <pre className={`flex-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto font-mono ${
                                    wrapJson ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                                }`}>
                                    {JSON.stringify(promptObject, null, 2)}
                                </pre>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Actions */}
                <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="h-8 text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !promptId}
                        className="h-8 text-sm bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </DialogContent>

            {/* Variable Editor Modal */}
            <VariableEditorModal
                isOpen={isVariableModalOpen}
                onClose={() => setIsVariableModalOpen(false)}
                onSave={handleVariableModalSave}
                existingVariable={editingVariable}
                existingNames={localVariables.map(v => v.name)}
                mode={variableModalMode}
            />
        </Dialog>
    );
}
