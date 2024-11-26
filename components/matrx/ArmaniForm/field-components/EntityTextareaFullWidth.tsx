'use client';

import React, {useEffect, useRef} from "react";
import {cn} from "@/utils/cn";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui";
import {EntityBaseFieldProps} from "../EntityBaseField";

interface EntityTextareaProps extends EntityBaseFieldProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'size' | 'value'> {
}

const EntityTextareaFullWidth: React.FC<EntityTextareaProps> = (
    {
        entityKey,
        dynamicFieldInfo: field,
        value = "",
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = "default",
        disabled = false,
        floatingLabel = true,
        labelPosition = 'default',
        ...props
    }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const customProps = field.componentProps as Record<string, unknown>;
    const initialRows = customProps?.rows as number ?? 3;
    const maxRows = customProps?.maxRows as number ?? 35;
    const customLabelPosition = customProps?.labelPosition as ('default' | 'inline' | 'above' | 'side') ?? 'default';
    const resolvedLabelPosition = customLabelPosition === 'default' ? 'above' : customLabelPosition;

    const uniqueId = `${entityKey}-${field.name}`;

    // Auto-resize functionality
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const adjustHeight = () => {
            textarea.style.height = 'auto';
            const singleLineHeight = parseInt(getComputedStyle(textarea).lineHeight);
            const maxHeight = singleLineHeight * maxRows;

            const scrollHeight = textarea.scrollHeight;
            const newHeight = Math.min(scrollHeight, maxHeight);

            textarea.style.height = `${newHeight}px`;
            textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        };

        adjustHeight();
    }, [value, maxRows]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const variants = {
        destructive: "border-destructive text-destructive hover:border-destructive/90",
        success: "border-success text-success hover:border-success/90",
        outline: "border-2 hover:border-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "border-none bg-transparent hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        default: "hover:border-primary/50",
    };

    const densityConfig = {
        compact: {
            wrapper: "gap-1 py-0.5",
            textarea: "p-1.5",
            label: "text-sm",
        },
        normal: {
            wrapper: "gap-2 py-1",
            textarea: "p-2",
            label: "text-base",
        },
        comfortable: {
            wrapper: "gap-3 py-1.5",
            textarea: "p-2.5",
            label: "text-lg",
        },
    };

    const renderLabel = field.displayName && (
        <Label
            key={`label-${uniqueId}`}
            htmlFor={uniqueId}
            className={cn(
                densityConfig[density].label,
                "font-medium",
                disabled ? "text-muted-foreground cursor-not-allowed" : "text-foreground",
                resolvedLabelPosition === 'side' && "min-w-[120px] text-right",
                "select-none"
            )}
        >
            {field.displayName}
        </Label>
    );

    const renderTextarea = (
        <Textarea
            ref={textareaRef}
            key={`textarea-${uniqueId}`}
            id={uniqueId}
            value={value}
            onChange={handleChange}
            required={field.isRequired}
            disabled={disabled}
            rows={initialRows}
            className={cn(
                "min-h-[80px] w-full resize-none",
                "col-span-full",
                densityConfig[density].textarea,
                variants[variant],
                disabled ? "cursor-not-allowed opacity-50 bg-muted" : "",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "hover:ring-1 hover:ring-primary/50"
            )}
            {...props}
        />
    );

    const layouts = {
        default: (
            <div
                key={`wrapper-default-${uniqueId}`}
                className={cn("flex flex-col col-span-full", densityConfig[density].wrapper)}
            >
                {renderLabel}
                {renderTextarea}
            </div>
        ),
        inline: (
            <div
                key={`wrapper-inline-${uniqueId}`}
                className={cn("flex flex-col col-span-full", densityConfig[density].wrapper)}
            >
                {renderLabel}
                {renderTextarea}
            </div>
        ),
        above: (
            <div
                key={`wrapper-above-${uniqueId}`}
                className={cn("flex flex-col col-span-full", densityConfig[density].wrapper)}
            >
                {renderLabel}
                {renderTextarea}
            </div>
        ),
        side: (
            <div
                key={`wrapper-side-${uniqueId}`}
                className={cn(
                    "flex items-start col-span-full",
                    densityConfig[density].wrapper
                )}
            >
                {renderLabel}
                <div className="flex-1">
                    {renderTextarea}
                </div>
            </div>
        ),
    };

    return (
        <div
            key={`container-${uniqueId}`}
            className={cn(
                "w-full col-span-full",
                className
            )}
        >
            {layouts[resolvedLabelPosition]}
        </div>
    );
};

export default EntityTextareaFullWidth;
