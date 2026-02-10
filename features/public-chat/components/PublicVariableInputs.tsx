'use client';

import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatText } from '@/utils/text/text-case-converter';
import { VariableInputComponent } from '@/features/prompts/components/variable-inputs';
import type { PromptVariable } from '@/features/prompts/types/core';

// ============================================================================
// TYPES
// ============================================================================

interface PublicVariableInputsProps {
    variableDefaults: PromptVariable[];
    values: Record<string, string>;
    onChange: (name: string, value: string) => void;
    disabled?: boolean;
    compact?: boolean;
    /** Hide the outer wrapper (for embedding in custom layouts) */
    minimal?: boolean;
    /** Called when Enter is pressed on the last variable (if submitOnEnter) */
    onSubmit?: () => void;
    /** Whether Enter on the last variable should trigger submit */
    submitOnEnter?: boolean;
    /** Ref to the text input/textarea to focus after the last variable (if not submitting) */
    textInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PublicVariableInputs - Reusable variable input component for public chat
 * 
 * Features:
 * - Uses PromptVariable[] structure matching database schema
 * - Reuses VariableInputComponent for all input types
 * - Clean, compact UI similar to SmartPromptInput
 * - Expandable popovers for complex inputs
 * - No Redux dependency (Context API compatible)
 */
export function PublicVariableInputs({
    variableDefaults,
    values,
    onChange,
    disabled = false,
    compact = false,
    minimal = false,
    onSubmit,
    submitOnEnter = false,
    textInputRef,
}: PublicVariableInputsProps) {
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);

    const handleVariableChange = useCallback(
        (variableName: string, value: string) => {
            onChange(variableName, value);
        },
        [onChange]
    );

    const handleExpandedVariableChange = useCallback((variable: string | null) => {
        setExpandedVariable(variable);
    }, []);

    // Handle Enter key on collapsed variable inputs: cycle to next, then submit or focus text input
    const handleVariableKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const isLast = index === variableDefaults.length - 1;

            if (!isLast) {
                const container = (e.currentTarget as HTMLElement).closest('[data-variable-inputs]');
                const nextInput = container?.querySelector<HTMLInputElement>(`[data-variable-index="${index + 1}"]`);
                if (nextInput) {
                    nextInput.focus();
                    return;
                }
            }

            // Last variable: submit if submitOnEnter, else focus text input
            if (submitOnEnter && onSubmit) {
                onSubmit();
            } else if (textInputRef?.current) {
                textInputRef.current.focus();
            }
        }
    }, [variableDefaults.length, submitOnEnter, onSubmit, textInputRef]);

    if (variableDefaults.length === 0) {
        return null;
    }

    const variableInputs = (
        <>
            {variableDefaults.map((variable, index) => {
                        const isExpanded = expandedVariable === variable.name;
                        const value = values[variable.name] ?? variable.defaultValue ?? '';

                        return (
                            <div key={variable.name}>
                                {isExpanded ? (
                                    <Popover
                                        open={expandedVariable === variable.name}
                                        onOpenChange={(open) => {
                                            if (!open) {
                                                handleExpandedVariableChange(null);
                                            }
                                        }}
                                    >
                                        <PopoverTrigger asChild>
                                            <div
                                                className="w-full flex items-center gap-2 pl-3 pr-3 h-10 bg-background/50 border-b border-border cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
                                                onClick={() => handleExpandedVariableChange(variable.name)}
                                            >
                                                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 cursor-pointer">
                                                    {formatText(variable.name)}:
                                                </Label>
                                                <div className="flex-1 text-xs text-gray-900 dark:text-gray-200 min-w-0">
                                                    {value ? (
                                                        <span className="whitespace-nowrap overflow-hidden text-ellipsis block">
                                                            {value.replace(/\n/g, ' ↵ ')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-600">
                                                            {variable.helpText || 'Enter value...'}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronUp className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 flex-shrink-0 transition-colors" />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[500px] max-h-[500px] p-3 border-gray-300 dark:border-gray-700 overflow-y-auto scrollbar-thin"
                                            align="center"
                                            side="top"
                                            sideOffset={8}
                                        >
                                            <VariableInputComponent
                                                value={value}
                                                onChange={(newValue) => handleVariableChange(variable.name, newValue)}
                                                variableName={variable.name}
                                                customComponent={variable.customComponent}
                                                onRequestClose={() => handleExpandedVariableChange(null)}
                                                helpText={variable.helpText}
                                                compact={compact}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                ) : (
                                    <div className="flex items-center gap-2 pl-3 pr-3 h-10 bg-background border-b border-border hover:bg-gray-50 hover:dark:bg-zinc-800 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20 group">
                                        <Label
                                            className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 cursor-pointer"
                                            onClick={() => handleExpandedVariableChange(variable.name)}
                                        >
                                            {formatText(variable.name)}:
                                        </Label>
                                        <input
                                            type="text"
                                            value={value.includes('\n') ? value.replace(/\n/g, ' ↵ ') : value}
                                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                                            onKeyDown={(e) => handleVariableKeyDown(e, index)}
                                            placeholder={variable.helpText || 'Enter value...'}
                                            className="flex-1 text-base md:text-xs bg-transparent border-none outline-none focus:outline-none text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 min-w-0"
                                            data-variable-index={index}
                                            disabled={disabled}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleExpandedVariableChange(variable.name)}
                                            className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            disabled={disabled}
                                            title="Expand to full editor"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
        </>
    );

    if (minimal) {
        // Minimal mode: no outer wrapper, direct border on each item
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden" data-variable-inputs>
                {variableInputs}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden" data-variable-inputs>
            {variableInputs}
        </div>
    );
}

export default PublicVariableInputs;
