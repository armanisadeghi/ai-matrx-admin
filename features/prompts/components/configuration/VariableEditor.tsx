"use client";

import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { VariableCustomComponent, VariableComponentType } from "@/features/prompts/types/core";
import { sanitizeVariableName, shouldShowSanitizationPreview } from "@/features/prompts/utils/variable-utils";

interface VariableEditorProps {
    name: string;
    defaultValue: string;
    customComponent?: VariableCustomComponent;
    existingNames?: string[]; // For duplicate checking
    originalName?: string; // For edit mode - allows keeping same name
    onNameChange?: (name: string) => void;
    onDefaultValueChange?: (value: string) => void;
    onCustomComponentChange?: (component: VariableCustomComponent | undefined) => void;
    readonly?: boolean;
}

export function VariableEditor({
    name,
    defaultValue,
    customComponent,
    existingNames = [],
    originalName,
    onNameChange,
    onDefaultValueChange,
    onCustomComponentChange,
    readonly = false,
}: VariableEditorProps) {
    const [componentType, setComponentType] = useState<VariableComponentType>(
        customComponent?.type || "textarea"
    );
    const [options, setOptions] = useState<string[]>(customComponent?.options || []);
    const [newOption, setNewOption] = useState("");
    const [allowOther, setAllowOther] = useState(customComponent?.allowOther || false);
    const [toggleOffLabel, setToggleOffLabel] = useState(
        customComponent?.toggleValues?.[0] || "No"
    );
    const [toggleOnLabel, setToggleOnLabel] = useState(
        customComponent?.toggleValues?.[1] || "Yes"
    );
    const [min, setMin] = useState<number | undefined>(customComponent?.min);
    const [max, setMax] = useState<number | undefined>(customComponent?.max);
    const [step, setStep] = useState<number>(customComponent?.step || 1);
    
    // Flag to prevent update loop during sync
    const isSyncingRef = useRef(false);

    // Sync all customComponent changes when it updates
    useEffect(() => {
        isSyncingRef.current = true;
        
        if (!customComponent) {
            setComponentType("textarea");
            setOptions([]);
            setAllowOther(false);
            setToggleOffLabel("No");
            setToggleOnLabel("Yes");
            setMin(undefined);
            setMax(undefined);
            setStep(1);
            // Use setTimeout to ensure sync flag is reset after state updates
            setTimeout(() => {
                isSyncingRef.current = false;
            }, 0);
            return;
        }

        // Sync component type
        setComponentType(customComponent.type || "textarea");

        // Sync options-based components
        if (customComponent.options) {
            setOptions([...customComponent.options]);
        } else {
            setOptions([]);
        }

        // Sync allowOther
        setAllowOther(customComponent.allowOther || false);

        // Sync toggle labels
        if (customComponent.toggleValues) {
            setToggleOffLabel(customComponent.toggleValues[0] || "No");
            setToggleOnLabel(customComponent.toggleValues[1] || "Yes");
        } else {
            setToggleOffLabel("No");
            setToggleOnLabel("Yes");
        }

        // Sync number settings
        setMin(customComponent.min);
        setMax(customComponent.max);
        setStep(customComponent.step || 1);
        
        // Use setTimeout to ensure sync flag is reset after state updates
        setTimeout(() => {
            isSyncingRef.current = false;
        }, 0);
    }, [customComponent]);

    // Update custom component when any setting changes
    useEffect(() => {
        if (readonly || !onCustomComponentChange || isSyncingRef.current) return;

        let newCustomComponent: VariableCustomComponent | undefined;

        if (componentType !== "textarea") {
            newCustomComponent = { type: componentType };

            if (componentType === "toggle") {
                newCustomComponent.toggleValues = [toggleOffLabel, toggleOnLabel];
            } else if (componentType === "radio" || componentType === "checkbox" || componentType === "select") {
                if (options.length > 0) {
                    newCustomComponent.options = options;
                    if (allowOther) {
                        newCustomComponent.allowOther = true;
                    }
                } else {
                    newCustomComponent = undefined;
                }
            } else if (componentType === "number") {
                if (min !== undefined) newCustomComponent.min = min;
                if (max !== undefined) newCustomComponent.max = max;
                if (step !== 1) newCustomComponent.step = step;
            }
        }

        onCustomComponentChange(newCustomComponent);
    }, [componentType, options, allowOther, toggleOffLabel, toggleOnLabel, min, max, step, readonly, onCustomComponentChange]);

    const sanitizedName = name.trim() ? sanitizeVariableName(name) : "";
    const showPreview = shouldShowSanitizationPreview(name);
    
    // Check if name is duplicate (but allow same name if it's the original name in edit mode)
    const isDuplicate = sanitizedName && sanitizedName !== originalName && existingNames.includes(sanitizedName);

    const handleAddOption = () => {
        if (newOption.trim() && !options.includes(newOption.trim())) {
            setOptions([...options, newOption.trim()]);
            setNewOption("");
        }
    };

    const handleRemoveOption = (option: string) => {
        setOptions(options.filter(o => o !== option));
    };

    return (
        <div className="space-y-6">
            {/* Variable Name */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Name</Label>
                <Input
                    type="text"
                    placeholder="e.g. city_name"
                    value={name}
                    onChange={(e) => onNameChange?.(e.target.value)}
                    disabled={readonly}
                    className={isDuplicate ? "border-red-500" : ""}
                />
                
                {showPreview && !readonly && (
                    <div className="px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <span className="text-blue-600 dark:text-blue-400">Will be saved as: </span>
                        <span className="font-mono text-blue-800 dark:text-blue-300">{sanitizedName}</span>
                    </div>
                )}
                
                {isDuplicate && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                        A variable with this name already exists
                    </p>
                )}
            </div>

            {/* Default Value */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Default Value</Label>
                <Textarea
                    placeholder="Optional"
                    value={defaultValue}
                    onChange={(e) => onDefaultValueChange?.(e.target.value)}
                    disabled={readonly}
                    autoGrow={true}
                    minHeight={80}
                    maxHeight={300}
                />
            </div>

            {/* Component Type */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Input Type</Label>
                <Select 
                    value={componentType} 
                    onValueChange={(value) => setComponentType(value as VariableComponentType)}
                    disabled={readonly}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="toggle">Toggle</SelectItem>
                        <SelectItem value="radio">Radio Group</SelectItem>
                        <SelectItem value="checkbox">Checkbox Group</SelectItem>
                        <SelectItem value="select">Select Dropdown</SelectItem>
                        <SelectItem value="number">Number Input</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Toggle Configuration */}
            {componentType === "toggle" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Toggle Labels</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Off</Label>
                            <Input
                                value={toggleOffLabel}
                                onChange={(e) => setToggleOffLabel(e.target.value)}
                                placeholder="No"
                                disabled={readonly}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">On</Label>
                            <Input
                                value={toggleOnLabel}
                                onChange={(e) => setToggleOnLabel(e.target.value)}
                                placeholder="Yes"
                                disabled={readonly}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Options Configuration */}
            {(componentType === "radio" || componentType === "checkbox" || componentType === "select") && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Options</Label>
                    
                    {options.length > 0 && (
                        <div className="space-y-2">
                            {options.map((option, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                    <span className="text-sm flex-1 text-gray-900 dark:text-gray-100">{option}</span>
                                    {!readonly && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(option)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {!readonly && (
                        <div className="flex gap-2">
                            <Input
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddOption();
                                    }
                                }}
                                placeholder="Add option..."
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddOption}
                                disabled={!newOption.trim()}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Label className="text-sm text-gray-900 dark:text-gray-100">
                            Allow "Other" option
                        </Label>
                        <Switch
                            checked={allowOther}
                            onCheckedChange={setAllowOther}
                            disabled={readonly}
                        />
                    </div>
                </div>
            )}

            {/* Number Configuration */}
            {componentType === "number" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Number Settings</Label>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Min</Label>
                            <Input
                                type="number"
                                value={min ?? ""}
                                onChange={(e) => setMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="None"
                                disabled={readonly}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Max</Label>
                            <Input
                                type="number"
                                value={max ?? ""}
                                onChange={(e) => setMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="None"
                                disabled={readonly}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Step</Label>
                            <Input
                                type="number"
                                value={step}
                                onChange={(e) => setStep(parseFloat(e.target.value) || 1)}
                                placeholder="1"
                                disabled={readonly}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

