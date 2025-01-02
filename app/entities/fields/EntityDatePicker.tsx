// app/entities/fields/EntityDatePicker.tsx

import React, { useMemo } from 'react';
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isValid } from 'date-fns';
import { Label } from "@/components/ui/label";
import {
    MatrxDatePicker,
    MatrxDateRangePicker,
    MatrxDatePickerWithPresets
} from '@/components/ui';
import { EntityComponentBaseProps } from "./types";
import { MatrxVariant } from '@/components/ui/types';

interface DateRange {
    from: Date;
    to: Date;
}

interface PresetOption {
    label: string;
    value: number;
}

interface EntityDatePickerProps extends EntityComponentBaseProps {
    value: string | Date | DateRange | null;
    labelPosition?: 'default' | 'inline' | 'above' | 'side';
}

const EntityDatePicker = React.forwardRef<HTMLDivElement, EntityDatePickerProps>(
    ({
        entityKey,
        dynamicFieldInfo,
        value,
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = "outline",
        disabled = false,
        labelPosition = 'default',
        ...props
    }, ref) => {
        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown> || {};
        const subComponent = customProps?.subComponent as ('date' | 'datetime' | 'daterange' | 'datewithpresets') ?? 'date';
        const formatString = customProps?.formatString as string ?? (subComponent === 'datetime' ? 'PPP HH:mm:ss' : 'PPP');
        const numberOfMonths = customProps?.numberOfMonths as number ?? 1;
        const minDate = customProps?.minDate ? new Date(customProps.minDate as string) : undefined;
        const maxDate = customProps?.maxDate ? new Date(customProps.maxDate as string) : undefined;
        const customLabelPosition = customProps?.labelPosition as ('default' | 'inline' | 'above' | 'side') ?? 'default';
        const resolvedLabelPosition = customLabelPosition === 'default' ? 'above' : customLabelPosition;

        const presetOptions = useMemo(() => 
            (customProps?.presets as PresetOption[]) ?? [
                { label: "Today", value: 0 },
                { label: "Tomorrow", value: 1 },
                { label: "In 3 days", value: 3 },
                { label: "In a week", value: 7 }
            ],
            [customProps?.presets]
        );

        const uniqueId = `${entityKey}-${dynamicFieldInfo.name}`;

        const parseValue = (val: any): Date | DateRange | undefined => {
            if (!val) return undefined;

            if (subComponent === 'daterange' && typeof val === 'object') {
                const from = val.from ? new Date(val.from) : undefined;
                const to = val.to ? new Date(val.to) : undefined;
                return (from && isValid(from) && (!to || isValid(to))) ? { from, to } : undefined;
            }

            if (val instanceof Date && isValid(val)) return val;

            if (typeof val === 'string') {
                const parsed = new Date(val);
                return isValid(parsed) ? parsed : undefined;
            }

            return undefined;
        };

        const parsedValue = parseValue(value);

        const densityConfig = {
            compact: {
                wrapper: "gap-1",
                input: "h-8 text-sm",
                label: "text-sm mb-1",
                icon: "h-3.5 w-3.5",
            },
            normal: {
                wrapper: "gap-2",
                input: "h-10",
                label: "text-base mb-1.5",
                icon: "h-4 w-4",
            },
            comfortable: {
                wrapper: "gap-3",
                input: "h-12 text-lg",
                label: "text-lg mb-2",
                icon: "h-5 w-5",
            },
        };

        const renderLabel = dynamicFieldInfo.displayName && (
            <Label
                htmlFor={uniqueId}
                className={cn(
                    densityConfig[density].label,
                    "font-medium",
                    disabled && "text-muted-foreground cursor-not-allowed",
                    resolvedLabelPosition === 'side' && "min-w-[120px] text-right",
                    "select-none"
                )}
            >
                {dynamicFieldInfo.displayName}
            </Label>
        );

        const commonProps = {
            id: uniqueId,
            className: cn(
                densityConfig[density].input,
                "w-full",
                disabled && "opacity-50 cursor-not-allowed",
                className
            ),
            variant: variant as MatrxVariant,
            disabled,
            icon: <CalendarIcon className={cn("mr-2", densityConfig[density].icon)} />,
            align: "start" as const,
            placeholder: "Select date",
            formatString,
            minDate,
            maxDate,
        };

        const handleChange = (newValue: Date | DateRange | undefined) => {
            onChange(newValue ?? null);
        };

        const handleRangeChange = (newValue: Date | { from?: Date; to?: Date } | undefined) => {
            onChange(newValue ?? null);
        };

        const renderDatePicker = () => {
            switch (subComponent) {
                case 'daterange':
                    return (
                        <MatrxDateRangePicker
                            {...commonProps}
                            value={parsedValue as DateRange}
                            onChange={handleRangeChange}
                            numberOfMonths={numberOfMonths}
                        />
                    );

                case 'datewithpresets':
                    return (
                        <MatrxDatePickerWithPresets
                            {...commonProps}
                            value={parsedValue as Date}
                            onChange={handleChange}
                            presets={presetOptions}
                            presetPlaceholder="Quick select"
                        />
                    );

                case 'datetime':
                case 'date':
                default:
                    return (
                        <MatrxDatePicker
                            {...commonProps}
                            value={parsedValue as Date}
                            onChange={handleChange}
                        />
                    );
            }
        };

        const layouts = {
            default: (
                <div className={cn("flex flex-col", densityConfig[density].wrapper)}>
                    {renderLabel}
                    {renderDatePicker()}
                </div>
            ),
            inline: (
                <div className={cn("flex flex-col", densityConfig[density].wrapper)}>
                    {renderLabel}
                    {renderDatePicker()}
                </div>
            ),
            above: (
                <div className={cn("flex flex-col", densityConfig[density].wrapper)}>
                    {renderLabel}
                    {renderDatePicker()}
                </div>
            ),
            side: (
                <div className={cn(
                    "flex items-start",
                    densityConfig[density].wrapper
                )}>
                    {renderLabel}
                    <div className="flex-1">
                        {renderDatePicker()}
                    </div>
                </div>
            ),
        };

        return (
            <div ref={ref} className={cn("w-full", className)}>
                {layouts[resolvedLabelPosition]}
            </div>
        );
    }
);

EntityDatePicker.displayName = "EntityDatePicker";

export default React.memo(EntityDatePicker);