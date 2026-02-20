"use client";

import { useState, useMemo, useEffect } from "react";
import { X, FileJson, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useModelControls, ControlDefinition } from "@/features/prompts/hooks/useModelControls";
import { PromptSettings } from "@/features/prompts/types/core";
import { SettingsJsonEditor } from "./SettingsJsonEditor";
import { getUnrecognizedSettings } from "@/features/prompts/utils/settings-filter";

interface ModelSettingsProps {
    modelId: string;
    models: any[];
    settings: PromptSettings;
    onSettingsChange: (settings: PromptSettings) => void;
    availableTools?: any[]; // Array of database tool objects
}

export function ModelSettings({
    modelId,
    models,
    settings,
    onSettingsChange,
    availableTools = [],
}: ModelSettingsProps) {
    // Get normalized controls for the selected model
    const { normalizedControls, error } = useModelControls(models, modelId);

    // Track which settings are enabled
    const [enabledSettings, setEnabledSettings] = useState<Set<string>>(() => {
        const enabled = new Set<string>();
        Object.entries(settings).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                enabled.add(key);
            }
        });
        return enabled;
    });

    // CRITICAL: Sync enabledSettings when settings change from outside
    // This ensures checkboxes accurately reflect what's in settings and prevents
    // sending disabled settings to the API. Without this, settings could have values
    // but appear unchecked, leading to silent inclusion of "disabled" settings.
    useEffect(() => {
        const enabled = new Set<string>();
        Object.entries(settings).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                enabled.add(key);
            }
        });
        setEnabledSettings(enabled);
    }, [settings]);

    // JSON editor modal state
    const [showJsonEditor, setShowJsonEditor] = useState(false);

    // Get all recognized keys from normalizedControls
    const recognizedKeys = useMemo(() => {
        if (!normalizedControls) return new Set<string>();
        const keys = new Set<string>();
        Object.keys(normalizedControls).forEach(key => {
            if (key !== 'rawControls' && key !== 'unmappedControls') {
                keys.add(key);
            }
        });
        return keys;
    }, [normalizedControls]);

    // Get unrecognized settings
    const unrecognizedSettings = useMemo(() => {
        return getUnrecognizedSettings(settings, recognizedKeys);
    }, [settings, recognizedKeys]);

    const handleSettingChange = (key: keyof PromptSettings, value: any) => {
        if (!enabledSettings.has(key)) {
            setEnabledSettings(new Set(enabledSettings).add(key));
        }

        // response_format: convert string enum values to dict format
        // "text" -> undefined (default, omit), "json_object" -> { type: "json_object" }
        if (key === 'response_format' && typeof value === 'string') {
            if (value === 'text' || value === '') {
                const { response_format: _removed, output_format: _legacy, ...rest } = settings;
                onSettingsChange(rest as PromptSettings);
                return;
            }
            onSettingsChange({
                ...settings,
                response_format: { type: value } as any,
            });
            return;
        }

        // Special handling for include_thoughts
        if (key === "include_thoughts") {
            if (value === false) {
                onSettingsChange({
                    ...settings,
                    [key]: value,
                    thinking_budget: -1,
                });
            } else if (value === true && settings.thinking_budget === -1) {
                onSettingsChange({
                    ...settings,
                    [key]: value,
                    thinking_budget: normalizedControls?.thinking_budget?.default ?? 1024,
                });
            } else {
                onSettingsChange({
                    ...settings,
                    [key]: value,
                });
            }
        } else {
            onSettingsChange({
                ...settings,
                [key]: value,
            });
        }
    };

    const handleToggleSetting = (key: keyof PromptSettings, enabled: boolean) => {
        const newEnabled = new Set(enabledSettings);
        if (enabled) {
            newEnabled.add(key);
            const control = (normalizedControls as any)[key];
            if (control) {
                let defaultValue: any = control.default;
                if (defaultValue === null || defaultValue === undefined) {
                    if (control.type === 'number' || control.type === 'integer') {
                        defaultValue = control.min ?? 0;
                    } else if (control.type === 'string' || control.type === 'string_array') {
                        defaultValue = '';
                    } else if (control.type === 'boolean') {
                        defaultValue = false;
                    } else if (control.type === 'enum' && control.enum && control.enum.length > 0) {
                        defaultValue = control.enum[0];
                    } else if (control.type === 'array' || control.type === 'object_array') {
                        defaultValue = [];
                    }
                }
                // response_format: convert string enum default to dict
                if (key === 'response_format' && typeof defaultValue === 'string') {
                    if (defaultValue === 'text' || defaultValue === '') {
                        defaultValue = undefined;
                    } else {
                        defaultValue = { type: defaultValue };
                    }
                }
                if (defaultValue !== undefined) {
                    onSettingsChange({ ...settings, [key]: defaultValue });
                }
            }
        } else {
            newEnabled.delete(key);
            const { [key]: removed, ...rest } = settings;
            onSettingsChange(rest as PromptSettings);
        }
        setEnabledSettings(newEnabled);
    };

    const handleJsonSave = (newSettings: PromptSettings) => {
        onSettingsChange(newSettings);
        const newEnabled = new Set<string>();
        Object.entries(newSettings).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                newEnabled.add(key);
            }
        });
        setEnabledSettings(newEnabled);
    };

    if (error || !normalizedControls) {
        return (
            <div className="text-xs text-red-600 dark:text-red-400">
                Error loading model controls: {error}
            </div>
        );
    }

    // Helper to render a setting control consistently
    const renderControl = (
        key: keyof PromptSettings,
        label: string,
        control: ControlDefinition
    ) => {
        const isEnabled = enabledSettings.has(key);
        const value = (settings as any)[key];
        const checkboxId = `setting-${key}`;

        return (
            <div key={key} className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleToggleSetting(key, !isEnabled)}>
                    <Checkbox
                        id={checkboxId}
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleSetting(key, checked as boolean)}
                        className="cursor-pointer"
                    />
                    <Label htmlFor={checkboxId} className={`text-xs flex-shrink-0 w-36 cursor-pointer ${isEnabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        {label}
                    </Label>
                </div>
                <div className={`flex-1 ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {renderControlInput(key, control, value, isEnabled)}
                </div>
            </div>
        );
    };

    const renderControlInput = (
        key: keyof PromptSettings,
        control: ControlDefinition,
        value: any,
        isEnabled: boolean
    ) => {
        // For response_format, extract string type from dict for display
        let actualValue = value ?? control.default ?? (control.type === 'number' || control.type === 'integer' ? control.min ?? 0 : '');
        if (key === 'response_format' && typeof actualValue === 'object' && actualValue?.type) {
            actualValue = actualValue.type;
        }

        // Enum / Select
        if (control.type === 'enum' && control.enum) {
            return (
                <Select
                    value={actualValue}
                    onValueChange={(val) => handleSettingChange(key, val)}
                    disabled={!isEnabled}
                >
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                        {control.enum.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs py-1">
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        // Boolean / Checkbox
        if (control.type === 'boolean') {
            const boolCheckboxId = `bool-${key}`;
            return (
                <div className="flex items-center gap-2">
                    <Checkbox
                        id={boolCheckboxId}
                        checked={actualValue}
                        onCheckedChange={(checked) => handleSettingChange(key, checked)}
                        disabled={!isEnabled}
                        className="cursor-pointer"
                    />
                    <Label htmlFor={boolCheckboxId} className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                        {actualValue ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
            );
        }

        // Number with slider
        if ((control.type === 'number' || control.type === 'integer') && control.min !== undefined && control.max !== undefined) {
            const step = control.type === 'integer' ? 1 : 0.01;
            return (
                <div className="flex items-center gap-2">
                    <Slider
                        min={control.min}
                        max={control.max}
                        step={step}
                        value={[actualValue]}
                        onValueChange={(val) => handleSettingChange(key, val[0])}
                        disabled={!isEnabled}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        min={control.min}
                        max={control.max}
                        step={step}
                        value={actualValue}
                        onChange={(e) => {
                            const val = control.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value);
                            if (!isNaN(val)) handleSettingChange(key, val);
                        }}
                        disabled={!isEnabled}
                        className="w-16 h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-border rounded disabled:opacity-50"
                    />
                </div>
            );
        }

        // Number without slider
        if (control.type === 'number' || control.type === 'integer') {
            return (
                <input
                    type="number"
                    min={control.min}
                    max={control.max}
                    value={actualValue}
                    onChange={(e) => {
                        const val = control.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value);
                        if (!isNaN(val)) handleSettingChange(key, val);
                    }}
                    disabled={!isEnabled}
                    className="h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-border rounded disabled:opacity-50 w-full"
                />
            );
        }

        // String array - textarea
        if (control.type === 'string_array') {
            const arrayValue = Array.isArray(value) ? value.join('\n') : '';
            return (
                <Textarea
                    value={arrayValue}
                    onChange={(e) => handleSettingChange(key, e.target.value.split('\n').filter(s => s.trim()))}
                    disabled={!isEnabled}
                    className="min-h-[60px] text-xs font-mono disabled:opacity-50"
                    placeholder="One value per line..."
                />
            );
        }

        // String / Default
        return (
            <input
                type="text"
                value={actualValue}
                onChange={(e) => handleSettingChange(key, e.target.value)}
                disabled={!isEnabled}
                className="h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-border rounded disabled:opacity-50 w-full"
            />
        );
    };

    // Define setting groups and order
    const textModelSettings = [
        { key: 'response_format', label: 'Response Format' },
        { key: 'temperature', label: 'Temperature' },
        { key: 'max_output_tokens', label: 'Max Output Tokens' },
        { key: 'max_tokens', label: 'Max Tokens (Legacy)' },
        { key: 'top_p', label: 'Top P' },
        { key: 'top_k', label: 'Top K' },
        { key: 'thinking_budget', label: 'Thinking Budget' },
        { key: 'reasoning_effort', label: 'Reasoning Effort' },
        { key: 'verbosity', label: 'Verbosity' },
        { key: 'reasoning_summary', label: 'Reasoning Summary' },
        { key: 'tool_choice', label: 'Tool Choice' },
    ];

    const imageVideoSettings = [
        { key: 'steps', label: 'Steps' },
        { key: 'guidance_scale', label: 'Guidance Scale' },
        { key: 'seed', label: 'Seed' },
        { key: 'n', label: 'Number of Outputs' },
        { key: 'width', label: 'Width' },
        { key: 'height', label: 'Height' },
        { key: 'fps', label: 'FPS' },
        { key: 'seconds', label: 'Duration (seconds)' },
        { key: 'output_quality', label: 'Output Quality' },
        { key: 'negative_prompt', label: 'Negative Prompt' },
        { key: 'reference_images', label: 'Reference Images' },
        { key: 'response_format', label: 'Response Format' },
    ];

    const booleanSettings = [
        { key: 'store', label: 'Store Conversation' },
        { key: 'stream', label: 'Stream Response' },
        { key: 'parallel_tool_calls', label: 'Parallel Tool Calls' },
        { key: 'include_thoughts', label: 'Include Thoughts' },
        { key: 'image_urls', label: 'Image URLs' },
        { key: 'file_urls', label: 'File URLs' },
        { key: 'internal_web_search', label: 'Internal Web Search' },
        { key: 'internal_url_context', label: 'Internal URL Context' },
        { key: 'youtube_videos', label: 'YouTube Videos' },
        { key: 'disable_safety_checker', label: 'Disable Safety Checker' },
    ];

    return (
        <div className="space-y-2.5">
            {/* Unrecognized Settings Warning */}
            {unrecognizedSettings.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            Unrecognized Settings Detected
                        </div>
                        <div className="text-yellow-700 dark:text-yellow-300 mb-1">
                            The following settings are not shown in the UI: {unrecognizedSettings.join(', ')}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowJsonEditor(true)}
                            className="h-6 text-[10px] px-2"
                        >
                            <FileJson className="h-3 w-3 mr-1" />
                            View in JSON Editor
                        </Button>
                    </div>
                </div>
            )}

            {/* Text Model Settings */}
            {textModelSettings.map(({ key, label }) => {
                const control = (normalizedControls as any)[key];
                if (!control) return null;
                return renderControl(key as keyof PromptSettings, label, control);
            })}

            {/* Image/Video Settings */}
            {imageVideoSettings.some(({ key }) => (normalizedControls as any)[key]) && (
                <div className="border-t pt-2.5 mt-2.5">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Image/Video Settings
                    </div>
                    {imageVideoSettings.map(({ key, label }) => {
                        const control = (normalizedControls as any)[key];
                        if (!control) return null;
                        return renderControl(key as keyof PromptSettings, label, control);
                    })}
                </div>
            )}

            {/* Boolean Settings */}
            {booleanSettings.some(({ key }) => (normalizedControls as any)[key]) && (
                <div className="border-t pt-2.5 mt-2.5">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Feature Flags
                    </div>
                    {booleanSettings.map(({ key, label }) => {
                        const control = (normalizedControls as any)[key];
                        if (!control) return null;
                        return renderControl(key as keyof PromptSettings, label, control);
                    })}
                </div>
            )}

            {/* Tools Section */}
            {normalizedControls.tools && availableTools.length > 0 && (
                <div className="border-t pt-2.5 mt-2.5">
                    <div className="flex items-center gap-3 mb-2">
                        <div 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                                const checked = !enabledSettings.has('tools');
                                if (checked) {
                                    setEnabledSettings(new Set(enabledSettings).add('tools'));
                                    if (!settings.tools) {
                                        onSettingsChange({ ...settings, tools: [] });
                                    }
                                } else {
                                    const newEnabled = new Set(enabledSettings);
                                    newEnabled.delete('tools');
                                    setEnabledSettings(newEnabled);
                                    const { tools, ...rest } = settings;
                                    onSettingsChange(rest as PromptSettings);
                                }
                            }}
                        >
                            <Checkbox
                                id="setting-tools"
                                checked={enabledSettings.has('tools')}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setEnabledSettings(new Set(enabledSettings).add('tools'));
                                        if (!settings.tools) {
                                            onSettingsChange({ ...settings, tools: [] });
                                        }
                                    } else {
                                        const newEnabled = new Set(enabledSettings);
                                        newEnabled.delete('tools');
                                        setEnabledSettings(newEnabled);
                                        const { tools, ...rest } = settings;
                                        onSettingsChange(rest as PromptSettings);
                                    }
                                }}
                                className="cursor-pointer"
                            />
                            <Label htmlFor="setting-tools" className={`text-xs font-semibold flex-shrink-0 w-36 cursor-pointer ${enabledSettings.has('tools') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                                Tools
                            </Label>
                        </div>
                    </div>

                    {enabledSettings.has('tools') && (
                        <>
                            {availableTools.filter(tool => !settings.tools?.includes(typeof tool === 'string' ? tool : tool.name)).length > 0 && (
                                <div className="flex items-center gap-2 mb-2 ml-10">
                                    <Select
                                        value=""
                                        onValueChange={(toolName) => {
                                            const currentTools = settings.tools || [];
                                            if (!currentTools.includes(toolName)) {
                                                handleSettingChange("tools", [...currentTools, toolName]);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-7 text-xs flex-1">
                                            <SelectValue placeholder="Add tool..." />
                                        </SelectTrigger>
                                        <SelectContent className="text-xs">
                                            {availableTools
                                                .filter(tool => !settings.tools?.includes(typeof tool === 'string' ? tool : tool.name))
                                                .map((tool) => {
                                                    const toolName = typeof tool === 'string' ? tool : tool.name;
                                                    return (
                                                        <SelectItem key={toolName} value={toolName} className="text-xs py-1">
                                                            {toolName}
                                                        </SelectItem>
                                                    );
                                                })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {settings.tools && settings.tools.length > 0 ? (
                                <div className="space-y-1 ml-10">
                                    {settings.tools.map((toolName, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs"
                                        >
                                            <span className="text-green-700 dark:text-green-300 font-mono">
                                                {toolName}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const newTools = settings.tools?.filter((_, i) => i !== index) || [];
                                                    handleSettingChange("tools", newTools);
                                                }}
                                                className="text-green-600 dark:text-green-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2 ml-10">
                                    No tools selected
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* JSON Editor Button */}
            <div className="border-t pt-2.5 mt-2.5">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowJsonEditor(true)}
                    className="w-full"
                >
                    <FileJson className="h-4 w-4 mr-2" />
                    Edit as JSON
                </Button>
            </div>

            {/* JSON Editor Modal */}
            <SettingsJsonEditor
                isOpen={showJsonEditor}
                onClose={() => setShowJsonEditor(false)}
                settings={settings}
                onSave={handleJsonSave}
            />
        </div>
    );
}
