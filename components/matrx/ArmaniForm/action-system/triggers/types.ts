import React from "react";
import {MatrxVariant} from "../../field-components/types";
import {TRIGGER_COMPONENTS} from "./triggerRegistry";
import {IconName} from "../icons/iconRegistry";

export type TriggerComponent = typeof TRIGGER_COMPONENTS[keyof typeof TRIGGER_COMPONENTS];


// Rest of the interfaces remain the same
export interface TriggerProps {
    iconName?: IconName;
    label?: string;
    className?: string;
    children?: React.ReactNode;
    variant?: MatrxVariant;
    disabled?: boolean;

    eventHandlers?: {
        onClick?: ((...args: any[]) => void) | undefined;
        onChange?: ((...args: any[]) => void) | undefined;
        onValueChange?: ((value: any) => void) | undefined;
        onCheckedChange?: ((checked: boolean) => void) | undefined;
    };

    uiProps?: {
        menuLabel?: string;
        src?: string;
        alt?: string;
        tooltip?: string;
        side?: "top" | "bottom" | "left" | "right";
        component?: React.ReactNode;
        active?: boolean;
    };

    dataProps?: {
        checked?: boolean;
        value?: string;
        options?: {
            label: string;
            value?: string;
            disabled?: boolean;
            checked?: boolean;
            onClick?: (value?: string) => void;
            onCheckedChange?: (checked: boolean) => void;
        }[];
    }
}


export interface TriggerDataProps {
    checked?: boolean;
    value?: string;
    options?: {
        label: string;
        value?: string;
        disabled?: boolean;
        checked?: boolean;
        onClick?: (value?: string) => void;
        onCheckedChange?: (checked: boolean) => void;
    }[];
}


export interface TriggerEventHandlers {
    onClick?: ((...args: any[]) => void) | undefined;
    onChange?: ((...args: any[]) => void) | undefined;
    onValueChange?: ((value: any) => void) | undefined;
    onCheckedChange?: ((checked: boolean) => void) | undefined;
}

export interface TriggerUIProps {
    menuLabel?: string;
    src?: string;
    alt?: string;
    tooltip?: string;
    side?: "top" | "bottom" | "left" | "right";
    component?: React.ReactNode;
    active?: boolean;
}

// export interface TriggerProps
//     extends BaseTriggerProps,
//         TriggerEventHandlers,
//         TriggerDataProps,
//         TriggerUIProps {
// }

export interface CustomTriggerComponentProps {
    onClick?: (...args: any[]) => void;
    className?: string;
    disabled?: boolean;

    [key: string]: any;
}

