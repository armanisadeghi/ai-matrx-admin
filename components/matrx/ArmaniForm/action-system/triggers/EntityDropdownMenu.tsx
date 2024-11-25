import React from "react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {MatrxVariant} from "../../field-components/types";

type MenuItem = {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
};

type CheckboxItem = {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
};

type RadioGroup = {
    name: string;
    value: string;
    onValueChange: (value: string) => void;
    options: {
        label: string;
        value: string;
        disabled?: boolean;
    }[];
};

interface EntityDropdownMenuProps {
    trigger?: React.ReactNode;
    triggerText?: string;
    variant?: MatrxVariant;
    label?: string;
    items?: MenuItem[];
    checkboxItems?: CheckboxItem[];
    radioGroup?: RadioGroup;
    className?: string;
    disabled?: boolean;
}

export const EntityDropdownMenu: React.FC<EntityDropdownMenuProps> = (
    {
        trigger,
        triggerText = "Open",
        variant = "outline",
        label,
        items,
        checkboxItems,
        radioGroup,
        className,
        disabled = false,
    }) => {

    const triggerElement = React.useMemo(() => {
        if (trigger) {
            if (React.isValidElement<{ disabled?: boolean }>(trigger)) {
                return React.cloneElement(trigger, {
                    ...trigger.props,
                    disabled: disabled || trigger.props.disabled
                });
            }
            return trigger;
        }
        return <Button variant={variant} disabled={disabled}>{triggerText}</Button>;
    }, [trigger, variant]);


    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                asChild
                disabled={disabled}
            >
                {triggerElement}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className={className}
            >
                {label && (
                    <>
                        <DropdownMenuLabel>{label}</DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                    </>
                )}

                {/* Regular Menu Items */}
                {items?.map((item, index) => (
                    <DropdownMenuItem
                        key={`item-${index}`}
                        onClick={item.onClick}
                        disabled={disabled || item.disabled}
                    >
                        {item.label}
                    </DropdownMenuItem>
                ))}

                {/* Checkbox Items */}
                {checkboxItems?.map((item, index) => (
                    <DropdownMenuCheckboxItem
                        key={`checkbox-${index}`}
                        checked={item.checked}
                        onCheckedChange={item.onCheckedChange}
                        disabled={disabled || item.disabled}
                    >
                        {item.label}
                    </DropdownMenuCheckboxItem>
                ))}

                {/* Radio Group */}
                {radioGroup && (
                    <>
                        {(items?.length > 0 || checkboxItems?.length > 0) && (
                            <DropdownMenuSeparator/>
                        )}
                        <DropdownMenuRadioGroup
                            value={radioGroup.value}
                            onValueChange={radioGroup.onValueChange}
                        >
                            {radioGroup.options.map((option, index) => (
                                <DropdownMenuRadioItem
                                    key={`radio-${index}`}
                                    value={option.value}
                                    disabled={disabled || option.disabled}
                                >
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
