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
            variant={variant}
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
            variant={variant}
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
            variant={variant}
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
                        onChange={onChange}
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
        options = [],
        className = '',
        variant = "ghost",
        menuLabel,
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={variant}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={variant}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            items={options.map((option) => ({
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
        options = [],
        className = '',
        variant = "ghost",
        menuLabel,
        disabled,
        onValueChange,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={variant}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={variant}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            items={options.map((option) => ({
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
        options = [],
        className = '',
        variant = "ghost",
        menuLabel,
        disabled,
        children,
        onCheckedChange,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={variant}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={variant}
                            className="flex items-center gap-2"
                            disabled={disabled}
                        >
                            <ResolvedIcon className="w-4 h-4" />
                            {label}
                        </Button>
                    )
                )
            }
            checkboxItems={options.map((option) => ({
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
        options = [],
        value,
        onValueChange,
        className = '',
        variant = "ghost",
        menuLabel,
        disabled,
        children,
    }: TriggerProps
) => {
    const ResolvedIcon = iconName ? iconRegistry[iconName] : null;

    return (
        <EntityDropdownMenu
            triggerText={label}
            variant={variant}
            label={menuLabel}
            className={className}
            disabled={disabled}
            trigger={
                children || (
                    ResolvedIcon && (
                        <Button
                            variant={variant}
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
                value: value ?? options[0]?.value ?? "",
                onValueChange: (newValue) => {
                    const selectedOption = options.find(opt => opt.value === newValue);
                    selectedOption?.onClick?.(newValue);
                    onValueChange?.(newValue);
                },
                options: options.map((option) => ({
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
    }: TriggerProps) => (
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

export const TooltipActionTrigger = (
    {
        iconName,
        label,
        tooltip,
        onClick,
        className = '',
        side = "top",
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


export const TRIGGER_COMPONENTS = {
    BUTTON: ButtonTrigger,
    ICON: IconTrigger,
    LINK: LinkTrigger,
    TEXT: TextTrigger,
    CHIP: ChipTrigger,
    BADGE: BadgeTrigger,
    CARD: CardTrigger,
    FLOATING_BUTTON: FloatingButtonTrigger,
    TOGGLE: ToggleTrigger,
    DROPDOWN: DropdownTrigger,
    DROPDOWN_BASIC: DropdownBasicTrigger,
    DROPDOWN_CHECKBOX: DropdownCheckboxTrigger,
    DROPDOWN_RADIO: DropdownRadioTrigger,
    IMAGE: ImageTrigger,
    TOOLTIP: TooltipActionTrigger,
    TAB: TabTrigger,
    CUSTOM: CustomTrigger,
} as const;


export const renderTrigger = (type: keyof typeof TRIGGER_COMPONENTS, props: TriggerProps) => {
    const Trigger = TRIGGER_COMPONENTS[type];
    if (!Trigger) {
        throw new Error(`Unknown trigger type: ${type}`);
    }
    return <Trigger {...props} />;
};


// Example usage:
const myTrigger = renderTrigger("BUTTON", {
    label: "Click Me",
    onClick: () => console.log("Button clicked"),
    className: "text-primary",
});

const MyCustomComponent = () => (
    <div className="p-4 bg-blue-100 rounded shadow hover:shadow-lg cursor-pointer">
        <p>Click Me - Custom Trigger</p>
    </div>
);

const MyCustomTrigger = renderTrigger("CUSTOM", {
    component: <MyCustomComponent/>,
});

/*

export const registerButtonTrigger = () => {
    const buttonTriggerDefinition: TriggerDefinition = {
        component: ButtonTrigger,
        propDefinitions: {
            // Core props
            iconName: {
                valueType: 'direct',
                isRequired: false,
                validation: {
                    type: 'IconName',
                    allowedValues: Object.keys(iconRegistry),
                },
                metadata: {
                    description: 'Icon to display in the button.',
                    group: 'core',
                },
            },
            label: {
                valueType: 'direct',
                isRequired: false,
                validation: {
                    type: 'string',
                },
                metadata: {
                    description: 'Text label for the button.',
                    group: 'core',
                },
            },

            // UI props
            variant: {
                valueType: 'static',
                isRequired: false,
                defaultValue: 'ghost',
                validation: {
                    type: 'string',
                    allowedValues: ['ghost', 'primary', 'secondary'],
                },
                metadata: {
                    description: 'Visual variant of the button.',
                    group: 'ui',
                },
            },
            className: {
                valueType: 'direct',
                isRequired: false,
                defaultValue: '',
                validation: {
                    type: 'string',
                },
                metadata: {
                    description: 'CSS class name for the button.',
                    group: 'ui',
                },
            },
            size: {
                valueType: 'static',
                isRequired: false,
                defaultValue: 'sm',
                validation: {
                    type: 'string',
                    allowedValues: ['sm', 'md', 'lg'],
                },
                metadata: {
                    description: 'Size of the button.',
                    group: 'ui',
                },
            },
            disabled: {
                valueType: 'direct',
                isRequired: false,
                defaultValue: false,
                validation: {
                    type: 'boolean',
                },
                metadata: {
                    description: 'Whether the button is disabled.',
                    group: 'ui',
                },
            },
            children: {
                valueType: 'direct',
                isRequired: false,
                validation: {
                    type: 'ReactNode',
                },
                metadata: {
                    description: 'Custom content for the button.',
                    group: 'ui',
                },
            },

            // Event handlers
            onClick: {
                valueType: 'handler',
                isRequired: true,
                validation: {
                    type: 'function',
                },
                metadata: {
                    description: 'Click handler for the button.',
                    group: 'event',
                },
            },
        },
    };

    return buttonTriggerDefinition;
};
*/
