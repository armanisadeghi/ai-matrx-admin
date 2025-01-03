// app/entities/fields/EntityDatePicker.tsx

import React, { useMemo } from 'react';
import { CalendarIcon } from "lucide-react";
import { isValid } from 'date-fns';
import {
    MatrxDatePicker,
    MatrxDateRangePicker,
    MatrxDatePickerWithPresets
} from '@/components/ui';
import { EntityComponentBaseProps } from "../../types";
import { MatrxVariant } from '@/components/ui/types';
import { useFieldStyles } from '../add-ons/useFieldStyles';
import { FloatingFieldLabel, StandardFieldLabel } from '../add-ons/FloatingFieldLabel';

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
        disabled,
        className,
        density,
        animationPreset,
        size,
        textSize,
        variant,
        floatingLabel,
      }, ref) => {
        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown> || {};
        const subComponent = customProps?.subComponent as ('date' | 'datetime' | 'daterange' | 'datewithpresets') ?? 'date';
        const formatString = customProps?.formatString as string ?? (subComponent === 'datetime' ? 'PPP HH:mm:ss' : 'PPP');
        const numberOfMonths = customProps?.numberOfMonths as number ?? 1;
        const minDate = customProps?.minDate ? new Date(customProps.minDate as string) : undefined;
        const maxDate = customProps?.maxDate ? new Date(customProps.maxDate as string) : undefined;

        const { getInputStyles } = useFieldStyles({
            variant,
            size,
            density,
            disabled,
            hasValue: Boolean(value),
            isFloating: floatingLabel,
        });

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

        const handleChange = (newValue: Date | DateRange | undefined) => {
            onChange(newValue ?? null);
        };

        const handleRangeChange = (newValue: Date | { from?: Date; to?: Date } | undefined) => {
            onChange(newValue ?? null);
        };

        const commonProps = {
            id: dynamicFieldInfo.name,
            className: getInputStyles,
            variant: variant as MatrxVariant,
            disabled,
            icon: <CalendarIcon className="mr-2 h-4 w-4" />,
            align: "start" as const,
            formatString,
            minDate,
            maxDate,
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

        return (
            <div ref={ref} className="relative">
                {floatingLabel ? (
                    <div className="relative mt-1">
                        {renderDatePicker()}
                        <FloatingFieldLabel
                            htmlFor={dynamicFieldInfo.name}
                            disabled={disabled}
                            isFocused={false}
                            hasValue={Boolean(value)}
                        >
                            {dynamicFieldInfo.displayName}
                        </FloatingFieldLabel>
                    </div>
                ) : (
                    <>
                        <StandardFieldLabel
                            htmlFor={dynamicFieldInfo.name}
                            disabled={disabled}
                            required={dynamicFieldInfo.isRequired}
                        >
                            {dynamicFieldInfo.displayName}
                        </StandardFieldLabel>
                        {renderDatePicker()}
                    </>
                )}
            </div>
        );
    }
);

EntityDatePicker.displayName = "EntityDatePicker";

export default React.memo(EntityDatePicker);
