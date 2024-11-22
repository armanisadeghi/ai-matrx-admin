import React from 'react';
import {CalendarIcon} from "lucide-react";
import {addDays, format} from "date-fns";
import {cn} from "@/lib/utils";

import {Calendar} from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {DateRange} from "react-day-picker";

// Import original components to extend them
import {DatePicker as OriginalDatePicker} from './date-picker';
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {Button} from '../matrx/ArmaniForm/field-components/EntityButton';

// Types
interface PresetOption {
    label: string;
    value: number;
}

interface MatrxDatePickerBaseProps {
    className?: string;
    variant?: MatrxVariant;
    icon?: React.ReactNode;
    align?: "start" | "center" | "end";
    placeholder?: string;
}

interface MatrxDatePickerProps extends MatrxDatePickerBaseProps {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    formatString?: string;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
}

interface MatrxDateRangePickerProps extends MatrxDatePickerBaseProps {
    value?: DateRange;
    onChange: (date: DateRange | undefined) => void;
    numberOfMonths?: number;
    formatString?: string;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
}

interface MatrxDatePickerWithPresetsProps extends MatrxDatePickerProps {
    presets?: PresetOption[];
    presetPlaceholder?: string;
}

// Default values
const defaultIcon = <CalendarIcon className="mr-2 h-4 w-4"/>;

const defaultPresets: PresetOption[] = [
    {label: "Today", value: 0},
    {label: "Tomorrow", value: 1},
    {label: "In 3 days", value: 3},
    {label: "In a week", value: 7}
];

const defaults = {
    variant: "outline" as const,
    align: "start" as const,
    placeholder: "Pick a date",
    formatString: "PPP",
    numberOfMonths: 1,
    presetPlaceholder: "Quick select",
    icon: defaultIcon,
};

// Enhanced Single Date Picker
export const MatrxDatePicker: React.FC<MatrxDatePickerProps> = (
    {
        value,
        onChange,
        className = "",
        variant = defaults.variant,
        formatString = defaults.formatString,
        placeholder = defaults.placeholder,
        icon = defaults.icon,
        align = defaults.align,
        disabled = false,
        minDate,
        maxDate,
    }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={variant}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    {icon}
                    {value ? format(value, formatString) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    initialFocus
                    disabled={disabled}
                    fromDate={minDate}
                    toDate={maxDate}
                />
            </PopoverContent>
        </Popover>
    );
};

// Enhanced Date Range Picker
export const MatrxDateRangePicker: React.FC<MatrxDateRangePickerProps> = (
    {
        value,
        onChange,
        className = "",
        variant = defaults.variant,
        numberOfMonths = defaults.numberOfMonths,
        formatString = "LLL dd, y",
        placeholder = defaults.placeholder,
        icon = defaults.icon,
        align = defaults.align,
        disabled = false,
        minDate,
        maxDate,
    }) => {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={variant}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !value && "text-muted-foreground"
                        )}
                        disabled={disabled}
                    >
                        {icon}
                        {value?.from ? (
                            value.to ? (
                                <>
                                    {format(value.from, formatString)} -{" "}
                                    {format(value.to, formatString)}
                                </>
                            ) : (
                                format(value.from, formatString)
                            )
                        ) : (
                             <span>{placeholder}</span>
                         )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={align}>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={value?.from}
                        selected={value}
                        onSelect={onChange}
                        numberOfMonths={numberOfMonths}
                        disabled={disabled}
                        fromDate={minDate}
                        toDate={maxDate}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};

// Enhanced Date Picker with Presets
export const MatrxDatePickerWithPresets: React.FC<MatrxDatePickerWithPresetsProps> = (
    {
        value,
        onChange,
        className = "",
        variant = defaults.variant,
        formatString = defaults.formatString,
        placeholder = defaults.placeholder,
        icon = defaults.icon,
        align = defaults.align,
        presets = defaultPresets,
        presetPlaceholder = defaults.presetPlaceholder,
        disabled = false,
        minDate,
        maxDate,
    }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={variant}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    {icon}
                    {value ? format(value, formatString) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align={align}
                className="flex w-auto flex-col space-y-2 p-2"
            >
                <Select
                    onValueChange={(value) =>
                        onChange(addDays(new Date(), parseInt(value)))
                    }
                    disabled={disabled}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={presetPlaceholder}/>
                    </SelectTrigger>
                    <SelectContent position="popper">
                        {presets.map((preset) => (
                            <SelectItem
                                key={preset.value}
                                value={preset.value.toString()}
                            >
                                {preset.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="rounded-md border">
                    <Calendar
                        mode="single"
                        selected={value}
                        onSelect={onChange}
                        disabled={disabled}
                        fromDate={minDate}
                        toDate={maxDate}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};


/* Usage Examples
// Basic Date Picker
<MatrxDatePicker
    onChange={(date) => console.log(date)}
    value={new Date()}
/>

// Date Range Picker with 2 months
<MatrxDateRangePicker
    onChange={(range) => console.log(range)}
    numberOfMonths={2}
    className="custom-class"
/>

// Date Picker with Custom Presets
<MatrxDatePickerWithPresets
    onChange={(date) => console.log(date)}
    presets={[
        { label: "Next Month", value: 30 },
        { label: "Next Quarter", value: 90 }
    ]}
/>*/
