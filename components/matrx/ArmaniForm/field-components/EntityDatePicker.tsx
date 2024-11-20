import React from 'react';
import {
    MatrxDatePicker,
    MatrxDateRangePicker,
    MatrxDatePickerWithPresets
} from '@/components/ui';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonVariant } from './types';

// Types from our Matrx components
interface PresetOption {
    label: string;
    value: number;
}

type DateRange = {
    from: Date;
    to: Date;
};

// System-provided props interface
interface EntityCommonProps {
    value: any;
    onChange: (value: any) => void;
    name: string;
    displayName: string;
    description?: string;
    componentProps: {
        subComponent: string;
        variant: string;
        placeholder: string;
        size: string;
        textSize: string;
        textColor: string;
        rows: string;
        animation: string;
        fullWidthValue: string;
        fullWidth: string;
        disabled: string;
        className: string;
        type: string;
        onChange: string;
        formatString: string;
        minDate: string;
        maxDate: string;
        presets?: string;
        numberOfMonths?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

// Default values
const defaultIcon = <CalendarIcon className="mr-2 h-4 w-4" />;

const defaultPresets: PresetOption[] = [
    { label: "Today", value: 0 },
    { label: "Tomorrow", value: 1 },
    { label: "In 3 days", value: 3 },
    { label: "In a week", value: 7 }
];

export const EntityDatePicker: React.FC<EntityCommonProps> = (props) => {
    const {
        value,
        onChange,
        componentProps,
        name,
        displayName,
        description
    } = props;

    // Helper function to parse dates safely
    const parseDateValue = (val: any): Date | undefined => {
        if (!val) return undefined;
        if (val instanceof Date) return isValid(val) ? val : undefined;
        try {
            const parsed = parse(String(val), 'yyyy-MM-dd HH:mm:ss', new Date());
            return isValid(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    };

    // Helper to convert system size to className
    const getSizeClassName = (size: string): string => {
        switch (size) {
            case 'sm': return 'text-sm';
            case 'lg': return 'text-lg';
            case 'xl': return 'text-xl';
            default: return 'text-base';
        }
    };

    // Helper to convert variant to ButtonVariant
    const getButtonVariant = (variant: string): ButtonVariant => {
        switch (variant) {
            case 'outline':
            case 'destructive':
            case 'secondary':
            case 'ghost':
            case 'link':
                return variant as ButtonVariant;
            default:
                return 'outline';
        }
    };

    // Parse presets if they exist
    const parsePresets = (presetsStr: string): PresetOption[] => {
        try {
            if (presetsStr === 'default') return defaultPresets;
            const parsed = JSON.parse(presetsStr);
            if (Array.isArray(parsed)) {
                return parsed.map(p => ({
                    label: String(p.label),
                    value: Number(p.value)
                }));
            }
            return defaultPresets;
        } catch {
            return defaultPresets;
        }
    };

    // Generate className based on system props
    const generateClassName = (): string => {
        return cn(
            componentProps.className !== 'default' ? componentProps.className : '',
            getSizeClassName(componentProps.textSize),
            componentProps.fullWidth !== 'default' && componentProps.fullWidth === 'true' ? 'w-full' : ''
        );
    };

    switch (componentProps.subComponent) {
        case 'daterange':
            return (
                <MatrxDateRangePicker
                    value={value ? {
                        from: parseDateValue(value.from),
                        to: parseDateValue(value.to)
                    } : undefined}
                    onChange={onChange}
                    className={generateClassName()}
                    buttonVariant={getButtonVariant(componentProps.variant)}
                    icon={defaultIcon}
                    align="start"
                    placeholder={componentProps.placeholder !== 'default' ? componentProps.placeholder : displayName}
                    numberOfMonths={componentProps.numberOfMonths !== 'default' ?
                                    Number(componentProps.numberOfMonths) : 2}
                    formatString={componentProps.formatString !== 'default' ?
                                  componentProps.formatString : 'PPP'}
                    disabled={componentProps.disabled !== 'default' && componentProps.disabled === 'true'}
                    minDate={parseDateValue(componentProps.minDate)}
                    maxDate={parseDateValue(componentProps.maxDate)}
                />
            );

        case 'datewithpresets':
            return (
                <MatrxDatePickerWithPresets
                    value={parseDateValue(value)}
                    onChange={onChange}
                    className={generateClassName()}
                    buttonVariant={getButtonVariant(componentProps.variant)}
                    icon={defaultIcon}
                    align="start"
                    placeholder={componentProps.placeholder !== 'default' ? componentProps.placeholder : displayName}
                    formatString={componentProps.formatString !== 'default' ?
                                  componentProps.formatString : 'PPP'}
                    disabled={componentProps.disabled !== 'default' && componentProps.disabled === 'true'}
                    minDate={parseDateValue(componentProps.minDate)}
                    maxDate={parseDateValue(componentProps.maxDate)}
                    presets={componentProps.presets ? parsePresets(componentProps.presets) : defaultPresets}
                    presetPlaceholder="Quick select"
                />
            );

        case 'datetime':
        case 'date':
        default:
            return (
                <MatrxDatePicker
                    value={parseDateValue(value)}
                    onChange={onChange}
                    className={generateClassName()}
                    buttonVariant={getButtonVariant(componentProps.variant)}
                    icon={defaultIcon}
                    align="start"
                    placeholder={componentProps.placeholder !== 'default' ? componentProps.placeholder : displayName}
                    formatString={componentProps.formatString !== 'default' ?
                                  componentProps.formatString : componentProps.subComponent === 'datetime' ?
                                                                'PPP HH:mm:ss' : 'PPP'}
                    disabled={componentProps.disabled !== 'default' && componentProps.disabled === 'true'}
                    minDate={parseDateValue(componentProps.minDate)}
                    maxDate={parseDateValue(componentProps.maxDate)}
                />
            );
    }
};
