import React, {useState} from 'react';
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

// Common props interface for all floating label components
interface FloatingLabelBaseProps {
    label: string;
    rightElement?: React.ReactNode;
}

// Input component props
interface FloatingInputProps extends FloatingLabelBaseProps, Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
    value?: string;
    onChange?: (value: string) => void;
}

// Textarea component props
interface FloatingTextareaProps extends FloatingLabelBaseProps, Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'> {
    value?: string;
    onChange?: (value: string) => void;
    rows?: number;
}

// Select component props
interface FloatingSelectProps extends FloatingLabelBaseProps {
    value?: string;
    onChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}

// Floating Label Input
export const FloatingInput: React.FC<FloatingInputProps> = (
    {
        label,
        rightElement,
        value = '',
        onChange,
        className = '',
        ...props
    }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative">
            <Input
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`pt-2 pb-2 ${rightElement ? 'pr-10' : ''} ${className}`}
                {...props}
            />
            <label
                className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none
                    ${(isFocused || value)
                      ? '-top-2 text-xs text-primary before:content-[""] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-background before:to-background/80'
                      : 'top-2 text-muted-foreground'
                }`}
            >
                <span className="px-1 relative z-10">{label}</span>
            </label>
            {rightElement && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                    {rightElement}
                </div>
            )}
        </div>
    );
};

// Floating Label Textarea
export const FloatingTextarea: React.FC<FloatingTextareaProps> = (
    {
        label,
        rightElement,
        value = '',
        onChange,
        rows = 4,
        className = '',
        ...props
    }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative">
            <Textarea
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`pt-4 pb-2 min-h-[100px] resize-y ${rightElement ? 'pr-10' : ''} ${className}`}
                rows={rows}
                {...props}
            />
            <label
                className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none
                    ${(isFocused || value)
                      ? '-top-2 text-xs text-primary before:content-[""] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-background before:to-background/80'
                      : 'top-3 text-muted-foreground'
                }`}
            >
                <span className="px-1 relative z-10">{label}</span>
            </label>
            {rightElement && (
                <div className="absolute top-3 right-3 flex items-center">
                    {rightElement}
                </div>
            )}
        </div>
    );
};

// Floating Label Select
export const FloatingSelect: React.FC<FloatingSelectProps> = (
    {
        label,
        rightElement,
        value,
        onChange,
        options
    }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative">
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    className={`pt-2 pb-2 ${rightElement ? 'pr-10' : ''}`}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                >
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <label
                className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none
                    ${(isFocused || value)
                      ? '-top-2 text-xs text-primary before:content-[""] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-background before:to-background/80'
                      : 'top-2 text-muted-foreground'
                }`}
            >
                <span className="px-1 relative z-10">{label}</span>
            </label>
            {rightElement && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                    {rightElement}
                </div>
            )}
        </div>
    );
};
