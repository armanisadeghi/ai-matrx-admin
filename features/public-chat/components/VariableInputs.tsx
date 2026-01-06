'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface VariableSchema {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'text';
    required: boolean;
    default?: any;
    description?: string;
    options?: string[];
}

interface VariableInputsProps {
    variables: VariableSchema[];
    values: Record<string, any>;
    onChange: (name: string, value: any) => void;
    disabled?: boolean;
    compact?: boolean;
}

// ============================================================================
// INDIVIDUAL INPUT COMPONENTS
// ============================================================================

interface InputProps {
    variable: VariableSchema;
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
}

function TextInput({ variable, value, onChange, disabled }: InputProps) {
    const isLongText = variable.type === 'text';

    if (isLongText) {
        return (
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={variable.description || `Enter ${variable.name}`}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
        );
    }

    return (
        <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={variable.description || `Enter ${variable.name}`}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
    );
}

function NumberInput({ variable, value, onChange, disabled }: InputProps) {
    return (
        <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            placeholder={variable.description || `Enter ${variable.name}`}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
    );
}

function BooleanInput({ variable, value, onChange, disabled }: InputProps) {
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{variable.description || 'Enable'}</span>
        </label>
    );
}

function SelectInput({ variable, value, onChange, disabled }: InputProps) {
    if (!variable.options || variable.options.length === 0) {
        return <TextInput variable={variable} value={value} onChange={onChange} disabled={disabled} />;
    }

    return (
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <option value="">Select {variable.name}</option>
            {variable.options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    );
}

// ============================================================================
// VARIABLE INPUT WRAPPER
// ============================================================================

interface VariableInputWrapperProps extends InputProps {
    compact?: boolean;
}

function VariableInputWrapper({ variable, value, onChange, disabled, compact }: VariableInputWrapperProps) {
    const normalizedType = variable.type === 'text' ? 'string' : variable.type;

    const renderInput = () => {
        if (variable.options && variable.options.length > 0) {
            return <SelectInput variable={variable} value={value} onChange={onChange} disabled={disabled} />;
        }

        switch (normalizedType) {
            case 'number':
                return <NumberInput variable={variable} value={value} onChange={onChange} disabled={disabled} />;
            case 'boolean':
                return <BooleanInput variable={variable} value={value} onChange={onChange} disabled={disabled} />;
            default:
                return <TextInput variable={variable} value={value} onChange={onChange} disabled={disabled} />;
        }
    };

    const formatLabel = (name: string) => {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">
                    {formatLabel(variable.name)}
                    {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
                <div className="flex-1">{renderInput()}</div>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatLabel(variable.name)}
                    {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {variable.description && (
                    <div className="group relative">
                        <Info size={14} className="text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {variable.description}
                        </div>
                    </div>
                )}
            </div>
            {renderInput()}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VariableInputs({ variables, values, onChange, disabled, compact }: VariableInputsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleChange = useCallback(
        (name: string, value: any) => {
            onChange(name, value);
        },
        [onChange]
    );

    if (variables.length === 0) {
        return null;
    }

    return (
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Variables ({variables.length})
                </span>
                {isExpanded ? (
                    <ChevronUp size={18} className="text-gray-500" />
                ) : (
                    <ChevronDown size={18} className="text-gray-500" />
                )}
            </button>
            {isExpanded && (
                <div className={`px-4 pb-4 space-y-4 ${compact ? 'pt-2' : 'pt-0'}`}>
                    {variables.map((variable) => (
                        <VariableInputWrapper
                            key={variable.name}
                            variable={variable}
                            value={values[variable.name]}
                            onChange={(value) => handleChange(variable.name, value)}
                            disabled={disabled}
                            compact={compact}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default VariableInputs;
