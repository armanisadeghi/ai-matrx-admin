'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, SkipForward, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatText } from '@/utils/text/text-case-converter';
import type { PromptVariable, VariableCustomComponent } from '@/features/prompts/types/core';

// ============================================================================
// TYPES
// ============================================================================

interface GuidedVariableInputsProps {
    variableDefaults: PromptVariable[];
    values: Record<string, string>;
    onChange: (name: string, value: string) => void;
    disabled?: boolean;
    onSubmit?: (content: string, resources?: any[]) => Promise<boolean>;
    submitOnEnter?: boolean;
    textInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
}

// ============================================================================
// GUIDED SUB-COMPONENTS
// These are purpose-built for the one-at-a-time guided flow.
// They maximize width, feel lightweight, and auto-advance where sensible.
// ============================================================================

/** Button-style single select — tapping an option selects it and auto-advances */
function GuidedSelect({
    value,
    onChange,
    options,
    allowOther,
    onAutoAdvance,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    allowOther?: boolean;
    onAutoAdvance: () => void;
}) {
    const isOther = value.startsWith('Other: ');
    const [otherText, setOtherText] = useState(isOther ? value.slice(7) : '');
    const [showOther, setShowOther] = useState(isOther);

    const handleSelect = (option: string) => {
        onChange(option);
        setShowOther(false);
        // Auto-advance after a brief visual confirmation
        setTimeout(onAutoAdvance, 200);
    };

    const handleOtherClick = () => {
        setShowOther(true);
        onChange(`Other: ${otherText}`);
    };

    return (
        <div className="space-y-1.5">
            <div className="grid gap-1.5">
                {options.map((option) => {
                    const isActive = value === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                                isActive
                                    ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/30'
                                    : 'bg-background border-border hover:bg-accent hover:border-foreground/20 text-foreground'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                <span className={isActive ? 'font-medium' : ''}>{option || '(empty)'}</span>
                            </span>
                        </button>
                    );
                })}
                {allowOther && (
                    <button
                        type="button"
                        onClick={handleOtherClick}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                            showOther
                                ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/30'
                                : 'bg-background border-border hover:bg-accent hover:border-foreground/20 text-foreground'
                        }`}
                    >
                        Other...
                    </button>
                )}
            </div>
            {showOther && (
                <Textarea
                    value={otherText}
                    onChange={(e) => {
                        setOtherText(e.target.value);
                        onChange(`Other: ${e.target.value}`);
                    }}
                    placeholder="Type your answer..."
                    className="min-h-[60px] text-base md:text-sm mt-1"
                    autoFocus
                />
            )}
        </div>
    );
}

/** Button-style radio — same as GuidedSelect but semantically for radio types */
const GuidedRadio = GuidedSelect;

/** Multi-select with tappable pill buttons */
function GuidedCheckbox({
    value,
    onChange,
    options,
    allowOther,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    allowOther?: boolean;
}) {
    const selected = value ? value.split('\n').filter(Boolean) : [];
    const otherItem = selected.find((s) => s.startsWith('Other: '));
    const [otherText, setOtherText] = useState(otherItem ? otherItem.slice(7) : '');
    const [showOther, setShowOther] = useState(!!otherItem);

    const toggle = (option: string) => {
        const regular = selected.filter((s) => !s.startsWith('Other: '));
        const has = regular.includes(option);
        const next = has ? regular.filter((s) => s !== option) : [...regular, option];
        const all = showOther && otherText ? [...next, `Other: ${otherText}`] : next;
        onChange(all.join('\n'));
    };

    const handleOtherToggle = () => {
        const regular = selected.filter((s) => !s.startsWith('Other: '));
        if (showOther) {
            setShowOther(false);
            onChange(regular.join('\n'));
        } else {
            setShowOther(true);
            onChange([...regular, `Other: ${otherText}`].join('\n'));
        }
    };

    return (
        <div className="space-y-1.5">
            <div className="grid gap-1.5">
                {options.map((option) => {
                    const isActive = selected.includes(option);
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => toggle(option)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                                isActive
                                    ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/30'
                                    : 'bg-background border-border hover:bg-accent hover:border-foreground/20 text-foreground'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Checkbox checked={isActive} className="pointer-events-none" />
                                <span className={isActive ? 'font-medium' : ''}>{option || '(empty)'}</span>
                            </span>
                        </button>
                    );
                })}
                {allowOther && (
                    <button
                        type="button"
                        onClick={handleOtherToggle}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                            showOther
                                ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/30'
                                : 'bg-background border-border hover:bg-accent hover:border-foreground/20 text-foreground'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Checkbox checked={showOther} className="pointer-events-none" />
                            <span>Other...</span>
                        </span>
                    </button>
                )}
            </div>
            {showOther && (
                <Textarea
                    value={otherText}
                    onChange={(e) => {
                        setOtherText(e.target.value);
                        const regular = selected.filter((s) => !s.startsWith('Other: '));
                        onChange([...regular, `Other: ${e.target.value}`].join('\n'));
                    }}
                    placeholder="Type your answer..."
                    className="min-h-[60px] text-base md:text-sm mt-1"
                    autoFocus
                />
            )}
            {selected.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    {selected.length} selected — tap Next when done
                </p>
            )}
        </div>
    );
}

/** Toggle with two big tappable buttons */
function GuidedToggle({
    value,
    onChange,
    toggleValues,
    onAutoAdvance,
}: {
    value: string;
    onChange: (v: string) => void;
    toggleValues?: [string, string];
    onAutoAdvance: () => void;
}) {
    const [offLabel, onLabel] = toggleValues || ['No', 'Yes'];

    const handleSelect = (val: string) => {
        onChange(val);
        setTimeout(onAutoAdvance, 200);
    };

    return (
        <div className="grid grid-cols-2 gap-2">
            {[offLabel, onLabel].map((label) => {
                const isActive = value === label;
                return (
                    <button
                        key={label}
                        type="button"
                        onClick={() => handleSelect(label)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                            isActive
                                ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/30'
                                : 'bg-background border-border hover:bg-accent hover:border-foreground/20 text-foreground'
                        }`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/** Number with big +/- and a centered display */
function GuidedNumber({
    value,
    onChange,
    min,
    max,
    step = 1,
}: {
    value: string;
    onChange: (v: string) => void;
    min?: number;
    max?: number;
    step?: number;
}) {
    const num = parseFloat(value) || 0;
    const canDec = min === undefined || num > min;
    const canInc = max === undefined || num < max;

    return (
        <div className="flex items-center justify-center gap-4">
            <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => canDec && onChange((num - step).toString())}
                disabled={!canDec}
                className="h-12 w-12 p-0 rounded-full"
            >
                <Minus className="w-5 h-5" />
            </Button>
            <Input
                type="text"
                value={value}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || v === '-' || !isNaN(parseFloat(v))) onChange(v);
                }}
                className="w-24 text-center text-2xl font-semibold h-12 text-base"
                placeholder="0"
            />
            <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => canInc && onChange((num + step).toString())}
                disabled={!canInc}
                className="h-12 w-12 p-0 rounded-full"
            >
                <Plus className="w-5 h-5" />
            </Button>
        </div>
    );
}

/** Textarea — simple, full width */
function GuidedTextarea({
    value,
    onChange,
    variableName,
}: {
    value: string;
    onChange: (v: string) => void;
    variableName: string;
}) {
    return (
        <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type your ${variableName.toLowerCase()}...`}
            className="min-h-[100px] text-base md:text-sm resize-none"
            autoFocus
        />
    );
}

// ============================================================================
// GUIDED VARIABLE INPUT RENDERER
// Routes to the correct guided sub-component
// ============================================================================

function GuidedVariableContent({
    variable,
    value,
    onChange,
    onAutoAdvance,
}: {
    variable: PromptVariable;
    value: string;
    onChange: (v: string) => void;
    onAutoAdvance: () => void;
}) {
    const cc = variable.customComponent;

    if (!cc || cc.type === 'textarea') {
        return <GuidedTextarea value={value} onChange={onChange} variableName={variable.name} />;
    }

    switch (cc.type) {
        case 'select':
        case 'radio':
            if (!cc.options?.length) {
                return <GuidedTextarea value={value} onChange={onChange} variableName={variable.name} />;
            }
            return (
                <GuidedSelect
                    value={value}
                    onChange={onChange}
                    options={cc.options}
                    allowOther={cc.allowOther}
                    onAutoAdvance={onAutoAdvance}
                />
            );
        case 'checkbox':
            if (!cc.options?.length) {
                return <GuidedTextarea value={value} onChange={onChange} variableName={variable.name} />;
            }
            return (
                <GuidedCheckbox
                    value={value}
                    onChange={onChange}
                    options={cc.options}
                    allowOther={cc.allowOther}
                />
            );
        case 'toggle':
            return (
                <GuidedToggle
                    value={value}
                    onChange={onChange}
                    toggleValues={cc.toggleValues}
                    onAutoAdvance={onAutoAdvance}
                />
            );
        case 'number':
            return (
                <GuidedNumber
                    value={value}
                    onChange={onChange}
                    min={cc.min}
                    max={cc.max}
                    step={cc.step}
                />
            );
        default:
            return <GuidedTextarea value={value} onChange={onChange} variableName={variable.name} />;
    }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GuidedVariableInputs({
    variableDefaults,
    values,
    onChange,
    disabled = false,
    onSubmit,
    submitOnEnter = false,
    textInputRef,
}: GuidedVariableInputsProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const total = variableDefaults.length;

    if (total === 0) return null;

    const variable = variableDefaults[activeIndex];
    const value = values[variable.name] ?? variable.defaultValue ?? '';
    const formattedName = formatText(variable.name);
    const helpText = variable.helpText;

    // Count how many have been filled in
    const answeredCount = variableDefaults.filter((v) => {
        const val = values[v.name] ?? v.defaultValue ?? '';
        return val.trim() !== '';
    }).length;

    const goNext = useCallback(() => {
        if (activeIndex < total - 1) {
            setActiveIndex((i) => i + 1);
        }
    }, [activeIndex, total]);

    const goPrev = useCallback(() => {
        if (activeIndex > 0) {
            setActiveIndex((i) => i - 1);
        }
    }, [activeIndex]);

    const handleSkipAll = useCallback(() => {
        setIsCollapsed(true);
        textInputRef?.current?.focus();
    }, [textInputRef]);

    const handleToggleCollapse = useCallback(() => {
        setIsCollapsed((c) => !c);
    }, []);

    const handleChange = useCallback(
        (v: string) => {
            onChange(variable.name, v);
        },
        [onChange, variable.name]
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Only auto-advance on Enter for textarea-type inputs
                const cc = variable.customComponent;
                if (!cc || cc.type === 'textarea') {
                    e.preventDefault();
                    if (activeIndex < total - 1) {
                        goNext();
                    } else if (submitOnEnter && onSubmit) {
                        onSubmit('', undefined);
                    } else {
                        textInputRef?.current?.focus();
                    }
                }
            }
        },
        [variable, activeIndex, total, goNext, submitOnEnter, onSubmit, textInputRef]
    );

    // --- Progress dots ---
    const progressDots = (
        <div className="flex items-center gap-1">
            {variableDefaults.map((v, i) => {
                const filled = (values[v.name] ?? v.defaultValue ?? '').trim() !== '';
                const isCurrent = i === activeIndex;
                return (
                    <button
                        key={v.name}
                        type="button"
                        onClick={() => {
                            setActiveIndex(i);
                            if (isCollapsed) setIsCollapsed(false);
                        }}
                        className={`rounded-full transition-all ${
                            isCurrent
                                ? 'w-5 h-2 bg-primary'
                                : filled
                                  ? 'w-2 h-2 bg-primary/40'
                                  : 'w-2 h-2 bg-muted-foreground/20'
                        }`}
                        title={formatText(v.name)}
                    />
                );
            })}
        </div>
    );

    // --- Collapsed state: compact bar ---
    if (isCollapsed) {
        return (
            <div className="bg-card rounded-xl border border-border">
                <button
                    type="button"
                    onClick={handleToggleCollapse}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors rounded-xl"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {progressDots}
                        <span className="text-xs text-muted-foreground truncate">
                            {answeredCount}/{total} answered
                        </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </button>
            </div>
        );
    }

    // --- Expanded state: one question at a time ---
    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden" onKeyDown={handleKeyDown}>
            {/* Question header + navigation */}
            <div className="px-3 pt-3 pb-2">
                {/* Top row: dots + collapse/skip */}
                <div className="flex items-center justify-between mb-2">
                    {progressDots}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleSkipAll}
                            className="text-xs text-muted-foreground/70 hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
                        >
                            Skip
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleCollapse}
                            className="text-muted-foreground/70 hover:text-foreground p-0.5 rounded transition-colors"
                            title="Collapse"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Question label */}
                <div className="mb-1">
                    <h3 className="text-sm font-medium text-foreground">{formattedName}</h3>
                    {helpText && (
                        <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>
                    )}
                </div>
            </div>

            {/* Question content — full width */}
            <div className="px-3 pb-2">
                <GuidedVariableContent
                    variable={variable}
                    value={value}
                    onChange={handleChange}
                    onAutoAdvance={goNext}
                />
            </div>

            {/* Navigation row */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
                <button
                    type="button"
                    onClick={goPrev}
                    disabled={activeIndex === 0}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default transition-colors px-1 py-0.5"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                </button>

                <span className="text-[11px] text-muted-foreground/60">
                    {activeIndex + 1} of {total} &middot; all optional
                </span>

                {activeIndex < total - 1 ? (
                    <button
                        type="button"
                        onClick={goNext}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-1 py-0.5 font-medium"
                    >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSkipAll}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-1 py-0.5 font-medium"
                    >
                        Done
                        <Check className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default GuidedVariableInputs;
