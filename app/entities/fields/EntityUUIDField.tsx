// app/entities/fields/EntityUUID.tsx

import React, { useState } from 'react';
import { Wand2, Copy, Check, RotateCcw, History, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EntityComponentBaseProps } from "./types";

interface EntityUUIDProps extends EntityComponentBaseProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'value'> {
    value: string;
}

const EntityUUID = React.forwardRef<HTMLInputElement, EntityUUIDProps>(
    ({
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
        const [copied, setCopied] = useState(false);
        const [history, setHistory] = useState<string[]>([]);
        const [isFocused, setIsFocused] = useState(false);

        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
        const showHistory = customProps?.showHistory as boolean ?? true;
        const maxHistory = customProps?.maxHistory as number ?? 5;

        // UUID validation regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUUID = (uuid: string): boolean => uuidRegex.test(uuid);

        const variants = {
            destructive: "border-destructive text-destructive",
            success: "border-success text-success",
            outline: "border-2",
            secondary: "bg-secondary text-secondary-foreground",
            ghost: "border-none bg-transparent",
            link: "text-primary underline-offset-4 hover:underline",
            primary: "bg-primary text-primary-foreground",
            default: "",
        };

        const generateUUID = () => {
            const oldValue = value;
            const newUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

            onChange(newUuid);

            if (oldValue && isValidUUID(oldValue) && !history.includes(oldValue)) {
                setHistory(prev => [oldValue, ...prev].slice(0, maxHistory));
            }
        };

        const copyToClipboard = async () => {
            try {
                await navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        };

        const clearValue = () => {
            if (value && isValidUUID(value)) {
                setHistory(prev => [value, ...prev].slice(0, maxHistory));
            }
            onChange('');
        };

        const restoreFromHistory = (historicValue: string) => {
            if (value) {
                setHistory(prev => [value, ...prev.filter(v => v !== historicValue)].slice(0, maxHistory));
            }
            onChange(historicValue);
        };

        const getInputVariantClass = () => {
            if (!value) return '';
            return isValidUUID(value) ? 'border-green-500' : 'border-red-500';
        };

        const renderUUIDInput = () => (
            <div className="relative">
                <Input
                    ref={ref}
                    id={dynamicFieldInfo.name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={dynamicFieldInfo.isRequired}
                    disabled={disabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={cn(
                        "font-mono text-sm pr-32",
                        floatingLabel && "pt-6 pb-2",
                        variants[variant as keyof typeof variants] || variants.default,
                        getInputVariantClass(),
                        disabled ? "cursor-not-allowed opacity-50 bg-muted" : "",
                        className
                    )}
                    {...props}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={generateUUID}
                                disabled={disabled}
                            >
                                <Wand2 className="h-4 w-4"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate UUID</TooltipContent>
                    </Tooltip>

                    {value && (
                        <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={copyToClipboard}
                                        disabled={disabled}
                                    >
                                        {copied ? <Check className="h-4 w-4"/> : <Copy className="h-4 w-4"/>}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy to clipboard</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={clearValue}
                                        disabled={disabled}
                                    >
                                        <Trash className="h-4 w-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Clear</TooltipContent>
                            </Tooltip>
                        </>
                    )}

                    {showHistory && history.length > 0 && (
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            disabled={disabled}
                                        >
                                            <History className="h-4 w-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>History</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-[300px]">
                                {history.map((uuid, index) => (
                                    <DropdownMenuItem
                                        key={index}
                                        onClick={() => restoreFromHistory(uuid)}
                                        className="flex justify-between items-center font-mono"
                                    >
                                        <span className="truncate">{uuid}</span>
                                        <RotateCcw className="h-3 w-3 ml-2 flex-shrink-0"/>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                    onClick={() => setHistory([])}
                                    className="text-destructive"
                                >
                                    Clear History
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        );

        const FloatingLabel = React.memo(() => (
            <Label
                htmlFor={dynamicFieldInfo.name}
                className={cn(
                    "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm",
                    (isFocused || value)
                        ? cn(
                            "absolute -top-2 text-sm",
                            disabled
                                ? '[&]:text-gray-400 dark:[&]:text-gray-400'
                                : '[&]:text-blue-500 dark:[&]:text-blue-500'
                        )
                        : 'top-3 [&]:text-gray-400 dark:[&]:text-gray-400'
                )}
            >
                <span className="px-1 relative z-20">
                    {dynamicFieldInfo.displayName}
                </span>
            </Label>
        ));

        const StandardLabel = React.memo(() => (
            <Label
                htmlFor={dynamicFieldInfo.name}
                className={cn(
                    "block text-sm font-medium mb-1",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {dynamicFieldInfo.displayName}
            </Label>
        ));

        return (
            <div className={cn("relative", className)}>
                {floatingLabel ? (
                    <div className="relative mt-2">
                        {renderUUIDInput()}
                        <FloatingLabel />
                    </div>
                ) : (
                    <>
                        <StandardLabel />
                        {renderUUIDInput()}
                    </>
                )}
                {value && !isValidUUID(value) && (
                    <div className="absolute -bottom-5 left-0 text-xs text-red-500">
                        Invalid UUID format
                    </div>
                )}
            </div>
        );
    }
);

EntityUUID.displayName = "EntityUUID";

export default React.memo(EntityUUID);