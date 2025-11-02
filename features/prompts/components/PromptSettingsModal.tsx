"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyTextarea, Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Info, FileJson, Settings2, Variable, Plus, RefreshCw, AlertCircle, X, Sparkles } from "lucide-react";
import { PromptVariable } from "./PromptBuilder";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { VariableEditor } from "./configuration/VariableEditor";
import { ModelSettings } from "./configuration/ModelSettings";
import { VariableCustomComponent } from "../types/variable-components";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";
import { FullPromptOptimizer } from "./FullPromptOptimizer";

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
    onUpdate: (id: string, data: { 
        name: string; 
        description?: string; 
        variableDefaults: PromptVariable[];
        messages?: PromptMessage[];
        settings?: Record<string, any>;
    }) => void;
    onLocalStateUpdate: (updates: { 
        name?: string; 
        description?: string; 
        variableDefaults?: PromptVariable[];
        messages?: PromptMessage[];
        settings?: Record<string, any>;
    }) => void;
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
    const [localMessages, setLocalMessages] = useState<PromptMessage[]>([...messages]);
    const [localSettings, setLocalSettings] = useState<Record<string, any>>({ ...settings });
    const [isSaving, setIsSaving] = useState(false);
    
    // JSON editing state
    const [editableJson, setEditableJson] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonApplied, setJsonApplied] = useState(false);
    
    // Variable editor state
    const [selectedVariableIndex, setSelectedVariableIndex] = useState<number | null>(null);
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [editingVariableName, setEditingVariableName] = useState("");
    const [editingVariableDefaultValue, setEditingVariableDefaultValue] = useState("");
    const [editingVariableCustomComponent, setEditingVariableCustomComponent] = useState<VariableCustomComponent | undefined>();

    // Full prompt optimizer state
    const [isFullOptimizerOpen, setIsFullOptimizerOpen] = useState(false);

    // Reset local state when modal opens or props change
    useEffect(() => {
        if (isOpen) {
            setLocalName(promptName);
            setLocalDescription(promptDescription);
            setLocalVariables([...variableDefaults]);
            setLocalMessages([...messages]);
            setLocalSettings({ ...settings });
        }
    }, [isOpen, promptName, promptDescription, variableDefaults, messages, settings]);

    // Sync editing state when selecting a variable
    useEffect(() => {
        if (isAddingVariable) {
            setEditingVariableName("");
            setEditingVariableDefaultValue("");
            setEditingVariableCustomComponent(undefined);
        } else if (selectedVariableIndex !== null && localVariables[selectedVariableIndex]) {
            const variable = localVariables[selectedVariableIndex];
            setEditingVariableName(variable.name);
            setEditingVariableDefaultValue(variable.defaultValue);
            setEditingVariableCustomComponent(variable.customComponent);
        }
    }, [isAddingVariable, selectedVariableIndex, localVariables]);

    // Build the complete prompt object
    const promptObject = useMemo(() => {
        return {
            id: promptId,
            name: localName,
            description: localDescription,
            messages: localMessages,
            variableDefaults: localVariables,
            settings: localSettings,
        };
    }, [promptId, localName, localDescription, localMessages, localVariables, localSettings]);

    // Sync editableJson with promptObject
    useEffect(() => {
        setEditableJson(JSON.stringify(promptObject, null, 2));
        setJsonError(null);
        setJsonApplied(false);
    }, [promptObject]);

    const handleRemoveVariable = (name: string) => {
        setLocalVariables(prev => prev.filter(v => v.name !== name));
        if (localVariables.findIndex(v => v.name === name) === selectedVariableIndex) {
            setSelectedVariableIndex(null);
        }
    };

    const handleApplyJson = () => {
        try {
            const parsed = JSON.parse(editableJson);
            
            // Validate that ID matches (if provided in JSON)
            if (parsed.id && parsed.id !== promptId) {
                throw new Error(`ID mismatch: Expected "${promptId}" but got "${parsed.id}"`);
            }
            
            // Validate required fields
            if (!parsed.name || typeof parsed.name !== 'string') {
                throw new Error('Name is required and must be a string');
            }
            
            // Validate messages structure if provided
            if (parsed.messages && !Array.isArray(parsed.messages)) {
                throw new Error('Messages must be an array');
            }
            
            // Validate each message has role and content
            if (parsed.messages) {
                for (let i = 0; i < parsed.messages.length; i++) {
                    const msg = parsed.messages[i];
                    if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
                        throw new Error(`Message ${i} must have a valid role (system, user, or assistant)`);
                    }
                    if (typeof msg.content !== 'string') {
                        throw new Error(`Message ${i} content must be a string`);
                    }
                }
            }
            
            // Validate variableDefaults structure
            if (parsed.variableDefaults && !Array.isArray(parsed.variableDefaults)) {
                throw new Error('Variable defaults must be an array');
            }
            
            // Update all local state with parsed values
            setLocalName(parsed.name);
            setLocalDescription(parsed.description || '');
            setLocalVariables(Array.isArray(parsed.variableDefaults) ? parsed.variableDefaults : []);
            setLocalMessages(Array.isArray(parsed.messages) ? parsed.messages : localMessages);
            setLocalSettings(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : localSettings);
            
            setJsonError(null);
            setJsonApplied(true);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => setJsonApplied(false), 3000);
        } catch (error) {
            setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
            setJsonApplied(false);
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
                messages: localMessages,
                settings: localSettings,
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
        setLocalMessages([...messages]);
        setLocalSettings({ ...settings });
        onClose();
    };

    // Get model name from local settings
    const selectedModel = models.find(m => m.id === localSettings?.model_id);
    const modelName = selectedModel?.common_name || selectedModel?.name || "Unknown";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[95vh] flex flex-col bg-textured p-0">
                <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Prompt Settings
                        </DialogTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFullOptimizerOpen(true)}
                            className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                        >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Optimize All
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">
                                BETA
                            </span>
                        </Button>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="mx-4 mt-3 grid w-auto grid-cols-5 gap-1 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
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
                            <FileJson className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            JSON
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-4">
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

                        <TabsContent value="variables" className="h-full overflow-hidden flex flex-col mt-3">
                            <div className="flex justify-between items-center mb-3 flex-shrink-0">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Variables ({localVariables.length})</h3>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIsAddingVariable(true);
                                        setSelectedVariableIndex(null);
                                    }}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Add Variable
                                </Button>
                            </div>

                            <div className="flex-1 overflow-hidden flex gap-3">
                                {/* Variables List */}
                                <div className="w-64 flex-shrink-0 overflow-y-auto space-y-2">
                                    {localVariables.length === 0 && !isAddingVariable ? (
                                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                            <Variable className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p className="text-xs">No variables yet</p>
                                        </div>
                                    ) : (
                                        localVariables.map((variable, index) => (
                                            <div
                                                key={variable.name}
                                                onClick={() => {
                                                    setSelectedVariableIndex(index);
                                                    setIsAddingVariable(false);
                                                }}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                    selectedVariableIndex === index && !isAddingVariable
                                                        ? 'bg-cyan-100 dark:bg-cyan-900/30 border-2 border-cyan-500 dark:border-cyan-500'
                                                        : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                            {variable.name}
                                                        </p>
                                                        {variable.customComponent && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                {variable.customComponent.type}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveVariable(variable.name);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        title="Delete variable"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Variable Editor */}
                                <div className="flex-1 overflow-y-auto">
                                    {isAddingVariable ? (
                                        <div>
                                            <VariableEditor
                                                name={editingVariableName}
                                                defaultValue={editingVariableDefaultValue}
                                                customComponent={editingVariableCustomComponent}
                                                existingNames={localVariables.map(v => v.name)}
                                                onNameChange={setEditingVariableName}
                                                onDefaultValueChange={setEditingVariableDefaultValue}
                                                onCustomComponentChange={setEditingVariableCustomComponent}
                                            />
                                            <div className="flex justify-end gap-2 mt-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsAddingVariable(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const sanitizedName = editingVariableName.trim();
                                                        if (sanitizedName && !localVariables.some(v => v.name === sanitizedName)) {
                                                            setLocalVariables([...localVariables, { 
                                                                name: sanitizedName, 
                                                                defaultValue: editingVariableDefaultValue,
                                                                customComponent: editingVariableCustomComponent
                                                            }]);
                                                            setIsAddingVariable(false);
                                                        }
                                                    }}
                                                    disabled={!editingVariableName.trim() || localVariables.some(v => v.name === editingVariableName.trim())}
                                                >
                                                    Add Variable
                                                </Button>
                                            </div>
                                        </div>
                                    ) : selectedVariableIndex !== null && localVariables[selectedVariableIndex] ? (
                                        <div>
                                            <VariableEditor
                                                name={editingVariableName}
                                                defaultValue={editingVariableDefaultValue}
                                                customComponent={editingVariableCustomComponent}
                                                existingNames={localVariables.map(v => v.name)}
                                                originalName={localVariables[selectedVariableIndex].name}
                                                onNameChange={setEditingVariableName}
                                                onDefaultValueChange={setEditingVariableDefaultValue}
                                                onCustomComponentChange={setEditingVariableCustomComponent}
                                            />
                                            <div className="flex justify-end gap-2 mt-4">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const originalName = localVariables[selectedVariableIndex].name;
                                                        setLocalVariables(prev => prev.map(v => 
                                                            v.name === originalName 
                                                                ? { name: originalName, defaultValue: editingVariableDefaultValue, customComponent: editingVariableCustomComponent }
                                                                : v
                                                        ));
                                                    }}
                                                >
                                                    Save Changes
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 dark:text-gray-400 py-20">
                                            <Variable className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                            <p className="text-sm">Select a variable to edit or click Add to create a new one</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="messages" className="h-full overflow-y-auto mt-3 space-y-2">
                            {localMessages.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No messages defined</p>
                            ) : (
                                localMessages.map((message, index) => (
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
                            <div className="max-w-3xl mx-auto">
                                <ModelSettings
                                    modelId={localSettings?.model_id || ''}
                                    models={models}
                                    settings={{
                                        temperature: localSettings?.temperature,
                                        max_tokens: localSettings?.max_tokens,
                                        top_p: localSettings?.top_p,
                                        top_k: localSettings?.top_k,
                                        tools: localSettings?.tools,
                                        stream: localSettings?.stream,
                                        store: localSettings?.store,
                                        tool_choice: localSettings?.tool_choice,
                                        parallel_tool_calls: localSettings?.parallel_tool_calls,
                                        output_format: localSettings?.output_format,
                                        image_urls: localSettings?.image_urls,
                                        file_urls: localSettings?.file_urls,
                                        internal_web_search: localSettings?.internal_web_search,
                                        youtube_videos: localSettings?.youtube_videos,
                                        reasoning_effort: localSettings?.reasoning_effort,
                                        verbosity: localSettings?.verbosity,
                                        reasoning_summary: localSettings?.reasoning_summary,
                                    }}
                                    onSettingsChange={(newSettings) => {
                                        setLocalSettings(prev => ({
                                            ...prev,
                                            ...newSettings,
                                        }));
                                    }}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="json" className="flex-1 flex flex-col min-h-0 mt-3">
                            <div className="mb-3 flex justify-between items-center gap-2 flex-shrink-0">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    <Info className="w-3 h-3 flex-shrink-0" />
                                    <span>Edit the JSON (all fields except ID) and click "Apply Changes" to preview. Navigate to other tabs to see the impact. Changes won't be saved until you click "Save Settings".</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleApplyJson}
                                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 flex-shrink-0"
                                >
                                    {jsonApplied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 mr-1.5" />
                                            Applied!
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                            Apply Changes
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Error Message */}
                            {jsonError && (
                                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-start gap-1 flex-shrink-0">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>{jsonError}</span>
                                </div>
                            )}

                            {/* Success Message */}
                            {jsonApplied && !jsonError && (
                                <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300 flex items-start gap-1 flex-shrink-0">
                                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>Changes applied! Check other tabs to see updates. Click "Save Settings" to persist changes.</span>
                                </div>
                            )}

                            <div className="flex-1 min-h-0 overflow-y-auto">
                                <CodeBlock
                                    code={editableJson}
                                    language="json"
                                    onCodeChange={(newCode) => setEditableJson(newCode)}
                                    showLineNumbers={true}
                                    wrapLines={true}
                                    fontSize={14}
                                />
                            </div>
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

            {/* Full Prompt Optimizer */}
            <FullPromptOptimizer
                isOpen={isFullOptimizerOpen}
                onClose={() => setIsFullOptimizerOpen(false)}
                currentPromptObject={promptObject}
                onAccept={(optimizedObject) => {
                    // Apply optimized object to local state
                    if (optimizedObject.name && typeof optimizedObject.name === 'string') {
                        setLocalName(optimizedObject.name);
                    }
                    if (optimizedObject.description !== undefined) {
                        setLocalDescription(optimizedObject.description || '');
                    }
                    if (Array.isArray(optimizedObject.variableDefaults)) {
                        setLocalVariables(optimizedObject.variableDefaults);
                    }
                    if (Array.isArray(optimizedObject.messages)) {
                        setLocalMessages(optimizedObject.messages);
                    }
                    if (optimizedObject.settings && typeof optimizedObject.settings === 'object') {
                        setLocalSettings(optimizedObject.settings);
                    }
                    setIsFullOptimizerOpen(false);
                }}
            />
        </Dialog>
    );
}
