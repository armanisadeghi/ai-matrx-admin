import React from "react";
import {cn} from "@/utils/cn";
import {Link} from "lucide-react";
import {EntityDropdownMenu} from "./EntityDropdownMenu";
import {
    Button,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    Switch,
    TooltipProvider
} from "@/components/ui";
import {CustomTriggerComponentProps, TriggerProps} from "./types";
import {iconRegistry} from "../icons/iconRegistry";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

// Map MatrxVariant to Button variant
const mapVariant = (variant?: string): ButtonVariant => {
    switch (variant) {
        case 'primary':
        case 'success':
            return 'default';
        case 'destructive':
            return 'destructive';
        case 'outline':
            return 'outline';
        case 'secondary':
            return 'secondary';
        case 'ghost':
            return 'ghost';
        case 'link':
            return 'link';
        default:
            return 'ghost';
    }
};


export const ButtonTrigger = (
    {
        iconName,
        label,
        onClick,
        className,
        variant = "ghost",
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <Button
            variant={mapVariant(variant)}
            size="sm"
            className={className}
            onClick={onClick}
            disabled={disabled}
        >
            {children || (
                <>
                    {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                    {label}
                </>
            )}
        </Button>
    );
};

export const IconTrigger = (
    {
        iconName = 'link',
        onClick,
        className = '',
        variant = 'ghost',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconRegistry[iconName];

    return (
        <Button
            variant={mapVariant(variant)}
            size="sm"
            className={`h-8 w-8 p-0 ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children || <ResolvedIcon className="w-4 h-4" />}
        </Button>
    );
};

export const LinkTrigger = (
    {
        iconName,
        label,
        onClick,
        className = '',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <Link
            className={`flex items-center gap-2 ${className} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            onClick={disabled ? undefined : onClick}
        >
            {children || (
                <>
                    {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                    {label}
                </>
            )}
        </Link>
    );
};

export const TextTrigger = (
    {
        iconName,
        label,
        onClick,
        className = '',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <span
            className={`${disabled ? 'opacity-50' : 'cursor-pointer'} ${className}`}
            onClick={disabled ? undefined : onClick}
        >
            {children || (
                <>
                    {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                    {label}
                </>
            )}
        </span>
    );
};

export const ChipTrigger = (
    {
        iconName,
        label,
        onClick,
        className = '',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 
                ${disabled ? 'opacity-50' : 'hover:bg-gray-200 cursor-pointer'} ${className}`}
            onClick={disabled ? undefined : onClick}
        >
            {children || (
                <>
                    {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                    {label}
                </>
            )}
        </div>
    );
};

export const BadgeTrigger = (
    {
        iconName,
        label,
        eventHandlers,
        className = '',
        disabled,
        variant = "primary",
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;
    const onClick = eventHandlers?.onClick;

    return (
        <div
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md 
                bg-${variant}-100 text-${variant}-800 
                ${disabled ? 'opacity-50' : 'cursor-pointer'} ${className}`}
            onClick={disabled ? undefined : onClick}
        >
            {children || (
                <>
                    {ResolvedIcon && <ResolvedIcon className="w-3 h-3" />}
                    {label}
                </>
            )}
        </div>
    );
};

export const CardTrigger = (
    {
        iconName,
        label,
        onClick,
        className = '',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <div
            className={`p-4 rounded-lg border 
                ${disabled ? 'opacity-50' : 'hover:shadow-md cursor-pointer'} 
                transition-shadow ${className}`}
            onClick={disabled ? undefined : onClick}
        >
            {children || (
                <div className="flex items-center gap-2 mb-2">
                    {ResolvedIcon && <ResolvedIcon className="w-5 h-5" />}
                    {label}
                </div>
            )}
        </div>
    );
};

export const FloatingButtonTrigger = (
    {
        iconName,
        label,
        onClick,
        className = '',
        variant = "primary",
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <Button
            variant={mapVariant(variant)}
            className={`fixed bottom-4 right-4 rounded-full shadow-lg ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children || (
                <>
                    {ResolvedIcon && <ResolvedIcon className="w-5 h-5" />}
                    {label}
                </>
            )}
        </Button>
    );
};

export const ToggleTrigger = (
    {
        iconName,
        label,
        checked,
        onChange,
        className = '',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <div
            className={`flex items-center gap-2 ${className}`}
            onClick={disabled ? undefined : () => onChange?.(!checked)}
        >
            {children || (
                <>
                    <Switch
                        checked={checked}
                        onCheckedChange={(checked) => onChange?.(checked)}
                        disabled={disabled}
                    />
                    {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                    {label}
                </>
            )}
        </div>
    );
};

// Basic dropdown with simple click actions
export const DropdownTrigger = (
    {
        iconName,
        label = "Menu",
        options,
        className = '',
        variant = "ghost",
        menuLabel,
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;
    const menuOptions = options || [];

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={mapVariant(variant)}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={mapVariant(variant)}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            items={menuOptions.map((option) => ({
                label: option.label,
                onClick: () => option.onClick?.(option.value),
                disabled: option.disabled,
            }))}
        />
    );
};

export const DropdownBasicTrigger = (
    {
        iconName,
        label = "Menu",
        options,
        className = '',
        variant = "ghost",
        menuLabel,
        onValueChange,
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;
    const menuOptions = options || [];

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={mapVariant(variant)}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={mapVariant(variant)}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            items={menuOptions.map((option) => ({
                label: option.label,
                onClick: () => {
                    option.onClick?.(option.value);
                    onValueChange?.(option.value || option.label);
                },
                disabled: option.disabled,
            }))}
        />
    );
};

export const DropdownCheckboxTrigger = (
    {
        iconName,
        label = "Options",
        options,
        className = '',
        variant = "ghost",
        menuLabel,
        onCheckedChange,
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;
    const menuOptions = options || [];

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={mapVariant(variant)}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={mapVariant(variant)}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            checkboxItems={menuOptions.map((option) => ({
                label: option.label,
                checked: option.checked ?? false,
                onCheckedChange: (checked) => {
                    option.onCheckedChange?.(checked);
                    if (onCheckedChange) {
                        onCheckedChange(checked);
                    }
                },
                disabled: disabled || option.disabled,
            }))}
        />
    );
};

export const DropdownRadioTrigger = (
    {
        iconName,
        label = "Select",
        options,
        value,
        className = '',
        variant = "ghost",
        menuLabel,
        onValueChange,
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;
    const menuOptions = options || [];

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={mapVariant(variant)}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={mapVariant(variant)}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            radioGroup={{
                name: label,
                value: value ?? menuOptions[0]?.value ?? "",
                onValueChange: (newValue) => {
                    const selectedOption = menuOptions.find(opt => opt.value === newValue);
                    selectedOption?.onClick?.(newValue);
                    onValueChange?.(newValue);
                },
                options: menuOptions.map((option) => ({
                    label: option.label,
                    value: option.value ?? option.label,
                    disabled: disabled || option.disabled,
                })),
            }}
        />
    );
};


export const ImageTrigger = (
    {
        src,
        alt,
        onClick,
        className,
        disabled,
        children,
    }: TriggerProps) => {

    return (
        <div className={cn(
            disabled ? "opacity-50" : "cursor-pointer",
            className
        )}>
            {children || (
                <img
                    src={src}
                    alt={alt}
                    onClick={disabled ? undefined : onClick}
                    className={cn(
                        "w-full h-full object-cover",
                        disabled ? "pointer-events-none" : "hover:opacity-90"
                    )}
                />
            )}
        </div>
    );
};

export const TooltipActionTrigger = (
    {
        iconName,
        label,
        tooltip,
        side = "top",
        onClick,
        className = '',
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild disabled={disabled}>
                    <div
                        className={cn(
                            "inline-flex items-center gap-2",
                            disabled ? "opacity-50" : "cursor-pointer hover:opacity-80",
                            className
                        )}
                        onClick={disabled ? undefined : onClick}
                    >
                        {children || (
                            <>
                                {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                                {label}
                            </>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side={side} sideOffset={4}>
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export const TabTrigger = (
    {
        iconName,
        label,
        active,
        onClick,
        className = '',
        disabled,
        variant = "primary",
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <div
            className={cn(
                "px-4 py-2 border-b-2 transition-colors",
                active ? `border-${variant}-500 text-${variant}-500` : "border-transparent",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:text-gray-600",
                className
            )}
            onClick={disabled ? undefined : onClick}
        >
            {children || (
                <div className="flex items-center gap-2">
                    {ResolvedIcon && <ResolvedIcon className="w-4 h-4" />}
                    {label}
                </div>
            )}
        </div>
    );
};

export const CustomTrigger = (
    {
        component,
        onClick,
        disabled,
        className,
    }: TriggerProps) => {

    if (!component) {
        throw new Error("CustomTrigger requires a 'component' prop.");
    }
    if (React.isValidElement<CustomTriggerComponentProps>(component)) {
        const mergedProps: CustomTriggerComponentProps = {
            ...component.props,
            onClick: disabled ? undefined : (onClick || component.props.onClick),
            className: cn(
                component.props.className,
                disabled && "opacity-50 pointer-events-none",
                className
            ),
            disabled: disabled || component.props.disabled,
        };

        return React.cloneElement(component, mergedProps);
    }
    return <>{component}</>;
};
