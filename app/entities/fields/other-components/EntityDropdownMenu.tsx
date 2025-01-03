// components/DropdownMenuComponent.tsx
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
import { MatrxVariant } from '../types';

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
    triggerVariant?: MatrxVariant;
    label?: string;
    items?: MenuItem[];
    checkboxItems?: CheckboxItem[];
    radioGroup?: RadioGroup;
    className?: string;
}

export const EntityDropdownMenu: React.FC<EntityDropdownMenuProps> = (
    {
        trigger,
        triggerText = "Open",
        triggerVariant = "outline",
        label,
        items,
        checkboxItems,
        radioGroup,
        className,
    }) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {trigger || <Button variant={triggerVariant}>{triggerText}</Button>}
            </DropdownMenuTrigger>
            <DropdownMenuContent className={className}>
                {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
                {label && <DropdownMenuSeparator/>}

                {/* Regular Menu Items */}
                {items?.map((item, index) => (
                    <DropdownMenuItem
                        key={`item-${index}`}
                        onClick={item.onClick}
                        disabled={item.disabled}
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
                        disabled={item.disabled}
                    >
                        {item.label}
                    </DropdownMenuCheckboxItem>
                ))}

                {/* Radio Group */}
                {radioGroup && (
                    <>
                        {label && <DropdownMenuSeparator/>}
                        <DropdownMenuRadioGroup
                            value={radioGroup.value}
                            onValueChange={radioGroup.onValueChange}
                        >
                            {radioGroup.options.map((option, index) => (
                                <DropdownMenuRadioItem
                                    key={`radio-${index}`}
                                    value={option.value}
                                    disabled={option.disabled}
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

export default EntityDropdownMenu;
