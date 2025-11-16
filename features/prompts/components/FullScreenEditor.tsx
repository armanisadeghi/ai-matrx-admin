'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, MessageSquare, Plus, Wand2, Settings2, Variable, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PromptEditorContextMenu } from './PromptEditorContextMenu';
import { SystemPromptOptimizer } from '@/features/prompts/components/actions/prompt-optimizers/SystemPromptOptimizer';
import { ModelSettings } from './configuration/ModelSettings';
import { VariableEditor } from './configuration/VariableEditor';
import { sanitizeVariableName } from '@/features/prompts/utils/variable-utils';
import { formatText } from '@/utils/text/text-case-converter';
import { mapIcon } from '@/utils/icons/icon-mapper';
import { PromptMessage, PromptVariable, VariableCustomComponent, PromptSettings } from '@/features/prompts/types/core';

type MessageItem = 
    | { type: 'system'; index: -1 }
    | { type: 'message'; index: number }
    | { type: 'settings' }
    | { type: 'variables' }
    | { type: 'tools' };

interface FullScreenEditorProps {
    isOpen: boolean;
    onClose: () => void;
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    messages: PromptMessage[];
    onMessageContentChange: (index: number, content: string) => void;
    onMessageRoleChange: (index: number, role: string) => void;
    initialSelection?: MessageItem | null;
    onAddMessage?: () => void;
    // Model Settings
    model?: string;
    models?: any[];
    modelConfig?: PromptSettings;
    onModelChange?: (value: string) => void;
    onModelConfigChange?: (config: PromptSettings) => void;
    // Variables
    variableDefaults?: PromptVariable[];
    onAddVariable?: (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
    onUpdateVariable?: (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
    onRemoveVariable?: (variableName: string) => void;
    // Tools
    selectedTools?: string[];
    availableTools?: any[];
    onAddTool?: (tool: string) => void;
    onRemoveTool?: (tool: string) => void;
    modelSupportsTools?: boolean;
}

export function FullScreenEditor({
    isOpen,
    onClose,
    developerMessage,
    onDeveloperMessageChange,
    messages,
    onMessageContentChange,
    onMessageRoleChange,
    initialSelection,
    onAddMessage,
    model,
    models,
    modelConfig,
    onModelChange,
    onModelConfigChange,
    variableDefaults = [],
    onAddVariable,
    onUpdateVariable,
    onRemoveVariable,
    selectedTools = [],
    availableTools = [],
    onAddTool,
    onRemoveTool,
    modelSupportsTools = false,
}: FullScreenEditorProps) {
    const [selectedItem, setSelectedItem] = useState<MessageItem>({ type: 'system', index: -1 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
    const [selectedVariableIndex, setSelectedVariableIndex] = useState<number | null>(null);
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    
    // State for variable being edited/added
    const [editingVariableName, setEditingVariableName] = useState("");
    const [editingVariableDefaultValue, setEditingVariableDefaultValue] = useState("");
    const [editingVariableCustomComponent, setEditingVariableCustomComponent] = useState<VariableCustomComponent | undefined>();

    // Update selected item when initialSelection changes
    useEffect(() => {
        if (isOpen && initialSelection) {
            setSelectedItem(initialSelection);
        } else if (isOpen && !initialSelection) {
            // Reset to system message if no initial selection
            setSelectedItem({ type: 'system', index: -1 });
        }
    }, [isOpen, initialSelection]);

    // Sync editing state when selecting a variable
    useEffect(() => {
        if (isAddingVariable) {
            setEditingVariableName("");
            setEditingVariableDefaultValue("");
            setEditingVariableCustomComponent(undefined);
        } else if (selectedVariableIndex !== null && variableDefaults[selectedVariableIndex]) {
            const variable = variableDefaults[selectedVariableIndex];
            setEditingVariableName(variable.name);
            setEditingVariableDefaultValue(variable.defaultValue);
            setEditingVariableCustomComponent(variable.customComponent);
        }
    }, [isAddingVariable, selectedVariableIndex, variableDefaults]);

    const getCurrentContent = () => {
        if (selectedItem.type === 'system') {
            return developerMessage;
        }
        if (selectedItem.type === 'message') {
            return messages[selectedItem.index]?.content || '';
        }
        return '';
    };

    const handleContentChange = (newContent: string) => {
        if (selectedItem.type === 'system') {
            onDeveloperMessageChange(newContent);
        } else if (selectedItem.type === 'message') {
            onMessageContentChange(selectedItem.index, newContent);
        }
    };

    const getCurrentRole = () => {
        if (selectedItem.type === 'system') {
            return 'system';
        }
        if (selectedItem.type === 'message') {
            return messages[selectedItem.index]?.role || 'user';
        }
        return 'user';
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'system':
                return 'text-purple-600 dark:text-purple-400';
            case 'user':
                return 'text-blue-600 dark:text-blue-400';
            case 'assistant':
                return 'text-green-600 dark:text-green-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'system':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
            case 'user':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            case 'assistant':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            default:
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
        }
    };

    const handleOptimizedAccept = (optimizedText: string) => {
        onDeveloperMessageChange(optimizedText);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-screen h-screen p-0 m-0 rounded-none">
                <div className="flex h-full bg-gray-50 dark:bg-gray-950">
                    {/* Sidebar */}
                    <div className="w-80 bg-textured border-r border-gray-200 dark:border-gray-800 flex flex-col">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Full Screen Editor
                                </DialogTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={onClose}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Select a message to edit
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsOptimizerOpen(true)}
                                className="w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                            >
                                <Wand2 className="h-4 w-4 mr-2" />
                                Optimize System Prompt
                            </Button>
                        </div>

                        {/* Message List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {/* System Message */}
                            <button
                                onClick={() => setSelectedItem({ type: 'system', index: -1 })}
                                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                    selectedItem.type === 'system'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 dark:border-purple-500'
                                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Message 0
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor('system')}`}>
                                        system
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {developerMessage || 'No content'}
                                </p>
                            </button>

                            {/* Prompt Messages */}
                            {messages.map((message, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedItem({ type: 'message', index })}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                        selectedItem.type === 'message' && selectedItem.index === index
                                            ? `border-2 ${
                                                message.role === 'user'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-500'
                                                    : 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-500'
                                            }`
                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className={`w-4 h-4 ${getRoleColor(message.role)}`} />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Message {index + 1}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(message.role)}`}>
                                            {message.role}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {message.content || 'No content'}
                                    </p>
                                </button>
                            ))}

                            {/* Special Tabs Divider */}
                            {(models || variableDefaults.length > 0) && (
                                <div className="my-2 border-t border-gray-300 dark:border-gray-700" />
                            )}

                            {/* Model Settings Tab */}
                            {models && model && modelConfig && (
                                <button
                                    onClick={() => setSelectedItem({ type: 'settings' })}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                        selectedItem.type === 'settings'
                                            ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500 dark:border-orange-500'
                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Settings2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Model Settings
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {models.find(m => m.id === model)?.common_name || model}
                                    </p>
                                </button>
                            )}

                            {/* Variables Tab */}
                            {variableDefaults && variableDefaults.length >= 0 && onAddVariable && (
                                <button
                                    onClick={() => setSelectedItem({ type: 'variables' })}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                        selectedItem.type === 'variables'
                                            ? 'bg-cyan-100 dark:bg-cyan-900/30 border-2 border-cyan-500 dark:border-cyan-500'
                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Variable className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Variables
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                                            {variableDefaults.length}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {variableDefaults.length === 0 ? 'No variables' : variableDefaults.map(v => v.name).join(', ')}
                                    </p>
                                </button>
                            )}

                            {/* Tools Tab */}
                            {availableTools && availableTools.length > 0 && onAddTool && onRemoveTool && (
                                <button
                                    onClick={() => setSelectedItem({ type: 'tools' })}
                                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                        selectedItem.type === 'tools'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 dark:border-emerald-500'
                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Tools
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                            {selectedTools.length}
                                        </span>
                                        {!modelSupportsTools && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                N/A
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {selectedTools.length === 0 ? 'No tools' : `${selectedTools.length} selected`}
                                    </p>
                                </button>
                            )}
                        </div>

                        {/* Add Message Button */}
                        {onAddMessage && (
                            <div className="p-4 pt-1 border-t border-gray-200 dark:border-gray-800">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAddMessage}
                                    className="w-full text-gray-400 hover:text-gray-300 border border-dashed border-gray-600 hover:border-gray-500"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add message
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
                        {/* Editor Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-textured">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {selectedItem.type === 'system' 
                                            ? `Message 0` 
                                            : selectedItem.type === 'message'
                                            ? `Message ${selectedItem.index + 1}`
                                            : selectedItem.type === 'settings'
                                            ? 'Model Settings'
                                            : selectedItem.type === 'variables'
                                            ? 'Variables'
                                            : 'Tools'}
                                    </h3>
                                    {(selectedItem.type === 'system' || selectedItem.type === 'message') && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Role:</span>
                                            {selectedItem.type === 'system' ? (
                                                <span className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md">
                                                    Developer
                                                </span>
                                            ) : (
                                                <select
                                                    value={getCurrentRole()}
                                                    onChange={(e) => {
                                                        if (selectedItem.type === 'message') {
                                                            onMessageRoleChange(selectedItem.index, e.target.value);
                                                        }
                                                    }}
                                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-textured text-gray-900 dark:text-gray-100"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="assistant">Assistant</option>
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    {selectedItem.type === 'settings' && model && models && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Model:</span>
                                            <span className="px-3 py-1 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md">
                                                {models.find(m => m.id === model)?.common_name || model}
                                            </span>
                                        </div>
                                    )}
                                    {selectedItem.type === 'variables' && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Manage prompt variables and their default values
                                        </p>
                                    )}
                                    {selectedItem.type === 'tools' && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {modelSupportsTools ? 'Manage available tools for this prompt' : 'Tools not supported by current model'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 pr-12">
                                    {(selectedItem.type === 'system' || selectedItem.type === 'message') && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Right-click for content blocks
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden p-6">
                            {(selectedItem.type === 'system' || selectedItem.type === 'message') && (
                                <PromptEditorContextMenu getTextarea={() => textareaRef.current}>
                                    <textarea
                                        ref={textareaRef}
                                        value={getCurrentContent()}
                                        onChange={(e) => {
                                            handleContentChange(e.target.value);
                                        }}
                                        placeholder={
                                            selectedItem.type === 'system'
                                                ? "Enter system instructions for the AI..."
                                                : "Enter message content..."
                                        }
                                        className="w-full h-full bg-textured border border-gray-300 dark:border-gray-700 rounded-lg p-6 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 overflow-y-auto"
                                        autoFocus
                                    />
                                </PromptEditorContextMenu>
                            )}

                            {selectedItem.type === 'settings' && model && models && modelConfig && onModelConfigChange && onModelChange && (
                                <div className="h-full overflow-y-auto bg-textured border border-gray-300 dark:border-gray-700 rounded-lg p-6">
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        {/* Model Selection */}
                                        <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                                                Select Model
                                            </Label>
                                            <Select value={model} onValueChange={onModelChange}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue>
                                                        {models.find(m => m.id === model)?.common_name || model}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[400px]">
                                                    {models.map((m) => (
                                                        <SelectItem key={m.id} value={m.id}>
                                                            {m.common_name || m.id}
                                                            {m.is_deprecated && <span className="text-xs text-gray-400 ml-2">(deprecated)</span>}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Model Settings */}
                                        <div>
                                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                                                Model Configuration
                                            </Label>
                                            <ModelSettings
                                                modelId={model}
                                                models={models}
                                                settings={modelConfig}
                                                onSettingsChange={onModelConfigChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedItem.type === 'variables' && onAddVariable && onUpdateVariable && onRemoveVariable && (
                                <div className="h-full overflow-hidden flex flex-col">
                                    <div className="flex-1 overflow-hidden flex">
                                        {/* Variables List */}
                                        <div className="w-72 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 overflow-y-auto">
                                            <div className="flex items-center justify-between mb-4">
                                                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Variables ({variableDefaults.length})
                                                </Label>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsAddingVariable(true);
                                                        setSelectedVariableIndex(null);
                                                    }}
                                                    className="h-7"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Add
                                                </Button>
                                            </div>

                                            {variableDefaults.length === 0 && !isAddingVariable && (
                                                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                                    <Variable className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">No variables yet</p>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {variableDefaults.map((variable, index) => (
                                                    <div
                                                        key={variable.name}
                                                        onClick={() => {
                                                            setSelectedVariableIndex(index);
                                                            setIsAddingVariable(false);
                                                        }}
                                                        className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
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
                                                                    onRemoveVariable(variable.name);
                                                                    if (selectedVariableIndex === index) {
                                                                        setSelectedVariableIndex(null);
                                                                    }
                                                                }}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                title="Delete variable"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Variable Editor */}
                                        <div className="flex-1 overflow-y-auto bg-textured p-6">
                                            {isAddingVariable ? (
                                                <div className="max-w-2xl mx-auto">
                                                    <div className="mb-6">
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Variable</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create a new prompt variable</p>
                                                    </div>
                                                    <VariableEditor
                                                        name={editingVariableName}
                                                        defaultValue={editingVariableDefaultValue}
                                                        customComponent={editingVariableCustomComponent}
                                                        existingNames={variableDefaults.map(v => v.name)}
                                                        onNameChange={setEditingVariableName}
                                                        onDefaultValueChange={setEditingVariableDefaultValue}
                                                        onCustomComponentChange={setEditingVariableCustomComponent}
                                                    />
                                                    <div className="flex justify-end gap-2 mt-6">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setIsAddingVariable(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                const sanitizedName = sanitizeVariableName(editingVariableName);
                                                                if (sanitizedName && !variableDefaults.some(v => v.name === sanitizedName)) {
                                                                    onAddVariable(sanitizedName, editingVariableDefaultValue, editingVariableCustomComponent);
                                                                    setIsAddingVariable(false);
                                                                }
                                                            }}
                                                            disabled={!editingVariableName.trim() || variableDefaults.some(v => v.name === sanitizeVariableName(editingVariableName))}
                                                        >
                                                            Add Variable
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : selectedVariableIndex !== null && variableDefaults[selectedVariableIndex] ? (
                                                <div className="max-w-2xl mx-auto">
                                                    <div className="mb-6">
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Variable</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update variable configuration</p>
                                                    </div>
                                                    <VariableEditor
                                                        name={editingVariableName}
                                                        defaultValue={editingVariableDefaultValue}
                                                        customComponent={editingVariableCustomComponent}
                                                        existingNames={variableDefaults.map(v => v.name)}
                                                        originalName={variableDefaults[selectedVariableIndex].name}
                                                        onNameChange={setEditingVariableName}
                                                        onDefaultValueChange={setEditingVariableDefaultValue}
                                                        onCustomComponentChange={setEditingVariableCustomComponent}
                                                    />
                                                    <div className="flex justify-end gap-2 mt-6">
                                                        <Button
                                                            onClick={() => {
                                                                const originalName = variableDefaults[selectedVariableIndex].name;
                                                                const sanitizedName = sanitizeVariableName(editingVariableName);
                                                                if (sanitizedName) {
                                                                    onUpdateVariable(originalName, editingVariableDefaultValue, editingVariableCustomComponent);
                                                                }
                                                            }}
                                                            disabled={!editingVariableName.trim()}
                                                        >
                                                            Save Changes
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="max-w-2xl mx-auto text-center text-gray-500 dark:text-gray-400 py-20">
                                                    <Variable className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                    <p className="text-sm">Select a variable to edit or click Add to create a new one</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedItem.type === 'tools' && onAddTool && onRemoveTool && (
                                <div className="h-full overflow-hidden flex flex-col">
                                    <div className="flex-1 overflow-hidden flex">
                                        {/* Selected Tools List */}
                                        <div className="w-72 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 overflow-y-auto">
                                            <div className="mb-4">
                                                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Selected Tools ({selectedTools.length})
                                                </Label>
                                            </div>

                                            {!modelSupportsTools && (
                                                <div className="text-center text-gray-500 dark:text-gray-400 py-8 px-4">
                                                    <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">Tools not supported by current model</p>
                                                    <p className="text-[10px] mt-1">Change model to use tools</p>
                                                </div>
                                            )}

                                            {modelSupportsTools && selectedTools.length === 0 && (
                                                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                                    <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">No tools selected</p>
                                                </div>
                                            )}

                                            {modelSupportsTools && (
                                                <div className="space-y-2">
                                                    {selectedTools.map((toolName) => {
                                                        const tool = availableTools.find(t => t.name === toolName);
                                                        const displayName = formatText(toolName);
                                                        const icon = tool ? mapIcon(tool.icon, tool.category, 16) : null;
                                                        
                                                        return (
                                                            <div
                                                                key={toolName}
                                                                className="p-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        {icon && (
                                                                            <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                                                                                {icon}
                                                                            </span>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                                {displayName}
                                                                            </p>
                                                                            {tool?.category && (
                                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                                                    {tool.category}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => onRemoveTool(toolName)}
                                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                        title="Remove tool"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Available Tools */}
                                        <div className="flex-1 overflow-y-auto bg-textured p-6">
                                            <div className="max-w-2xl mx-auto h-full flex flex-col">
                                                <div className="mb-6 flex-shrink-0">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Tools</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        Click a tool to add it to your prompt
                                                    </p>
                                                </div>

                                                <div className="flex-1 overflow-y-auto">
                                                    {!modelSupportsTools ? (
                                                        <div className="text-center text-gray-500 dark:text-gray-400 py-20">
                                                            <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                            <p className="text-sm">Tools are not supported by the current model</p>
                                                            <p className="text-xs mt-2">Switch to a model that supports tools to enable this feature</p>
                                                        </div>
                                                    ) : availableTools.filter(tool => !selectedTools.includes(tool.name)).length === 0 ? (
                                                        <div className="text-center text-gray-500 dark:text-gray-400 py-20">
                                                            <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                            <p className="text-sm">All tools have been added</p>
                                                            <p className="text-xs mt-2">Remove some tools to add different ones</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-3 pb-4">
                                                            {availableTools
                                                                .filter(tool => !selectedTools.includes(tool.name))
                                                                .map((tool) => {
                                                                    const displayName = formatText(tool.name);
                                                                    const icon = mapIcon(tool.icon, tool.category, 20);
                                                                    
                                                                    return (
                                                                        <button
                                                                            key={tool.name}
                                                                            onClick={() => onAddTool(tool.name)}
                                                                            className="w-full flex items-start gap-4 p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                                                        >
                                                                            <span className="flex-shrink-0 text-gray-500 dark:text-gray-400 mt-0.5">
                                                                                {icon}
                                                                            </span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                                                        {displayName}
                                                                                    </h4>
                                                                                    {tool.category && (
                                                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-mono">
                                                                                            {tool.category.toLowerCase()}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {tool.description && (
                                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                                                        {tool.description}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
            
            {/* System Prompt Optimizer Dialog */}
            <SystemPromptOptimizer
                isOpen={isOptimizerOpen}
                onClose={() => setIsOptimizerOpen(false)}
                currentSystemMessage={developerMessage}
                onAccept={handleOptimizedAccept}
            />
        </Dialog>
    );
}

