'use client';

import React, {useState, useMemo} from 'react';
import {cn} from "@/lib/utils";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";

const useVariantStyles = (variant: string) => useMemo(() => ({
    destructive: "border-destructive text-destructive",
    success: "border-success text-success",
    outline: "border-2",
    secondary: "bg-secondary text-secondary-foreground",
    ghost: "border-none bg-transparent",
    link: "text-primary underline-offset-4 hover:underline",
    primary: "bg-primary text-primary-foreground",
    default: ""
})[variant], [variant]);

interface EntityComponentBaseProps {
    entityKey: string;
    dynamicFieldInfo: EntityStateField;
    value: unknown;
    onChange: (value: unknown) => void;
    disabled?: boolean;
    density?: string;
    animationPreset?: string;
    size?: string;
    variant?: string;
    floatingLabel?: boolean;
}

interface EntityTextareaFinalProps extends EntityComponentBaseProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
}

const FloatingLabel = React.memo(({
                                      id,
                                      label,
                                      isFocused,
                                      hasValue,
                                      disabled
                                  }: {
    id: string;
    label: string;
    isFocused: boolean;
    hasValue: boolean;
    disabled: boolean;
}) => (
    <Label
        htmlFor={id}
        className={cn(
            "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm",
            (isFocused || hasValue)
            ? cn("absolute -top-2 text-sm",
                disabled
                ? '[&]:text-gray-400 dark:[&]:text-gray-400'
                : '[&]:text-blue-500 dark:[&]:text-blue-500'
            )
            : 'top-3 [&]:text-gray-400 dark:[&]:text-gray-400'
        )}
    >
        <span className="px-1 relative z-20">{label}</span>
    </Label>
));

const StandardLabel = React.memo(({
                                      id,
                                      label,
                                      disabled
                                  }: {
    id: string;
    label: string;
    disabled: boolean;
}) => (
    <Label
        htmlFor={id}
        className={cn(
            "block text-sm font-medium mb-1",
            disabled ? "text-muted-foreground" : "text-foreground"
        )}
    >
        {label}
    </Label>
));

const EntityTextareaFinal = React.forwardRef<HTMLTextAreaElement, EntityTextareaFinalProps>((
    {
        entityKey,
        dynamicFieldInfo,
        value = '',
        onChange,
        density = 'normal',
        animationPreset = 'smooth',
        size = 'default',
        className,
        variant = 'default',
        disabled = false,
        floatingLabel = true,
        ...props
    }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const variantStyles = useVariantStyles(variant);

    const rows = (dynamicFieldInfo.componentProps as Record<string, unknown>)?.rows as number ?? 3;

    // TEMPORARY DEBUG SAFEGUARD - REMOVE AFTER TESTING
    const safeValue = (() => {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    })();

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const textareaProps = {
        id: dynamicFieldInfo.name,
        value: safeValue, // Using our safe value here
        onChange: handleChange,
        required: dynamicFieldInfo.isRequired,
        disabled,
        rows,
        className: cn(
            "text-md",
            "h-auto",
            variantStyles,
            disabled ? "cursor-not-allowed opacity-50 bg-muted" : "",
            floatingLabel && "pt-6 pb-2",
            className
        ),
        ref,
        ...props
    };

    if (floatingLabel) {
        return (
            <div className="relative mt-2">
                <Textarea
                    {...textareaProps}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                <FloatingLabel
                    id={dynamicFieldInfo.name}
                    label={dynamicFieldInfo.displayName}
                    isFocused={isFocused}
                    hasValue={!!safeValue}
                    disabled={disabled}
                />
            </div>
        );
    }

    return (
        <>
            <StandardLabel
                id={dynamicFieldInfo.name}
                label={dynamicFieldInfo.displayName}
                disabled={disabled}
            />
            <Textarea {...textareaProps} />
        </>
    );
});

EntityTextareaFinal.displayName = 'EntityTextareaFinal';

export default React.memo(EntityTextareaFinal);
