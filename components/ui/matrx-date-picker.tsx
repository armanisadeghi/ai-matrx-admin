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
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import EntityButton from '../matrx/ArmaniForm/field-components/EntityButton';

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

// Helper for US date formatting
const formatDateForUS = (date: Date | undefined, includeTime: boolean = false): string => {
    if (!date) return "";
    const options: Intl.DateTimeFormatOptions = includeTime
                                                ? { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", hour12: true }
                                                : { year: "numeric", month: "long", day: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(date);
};

// Utility to safely format dates
const safeFormat = (date: Date, formatString: string, fallback: string = ""): string => {
    try {
        return format(date, formatString);
    } catch (error) {
        return fallback || date.toLocaleDateString();
    }
};

// Enhanced Single Date Picker
export const MatrxDatePicker: React.FC<MatrxDatePickerProps> = ({
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
    const includeTime = formatString.toLowerCase().includes("hh") || formatString.toLowerCase().includes("p");

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
                    {value
                        ? formatDateForUS(value, includeTime) // Include time if needed
                        : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(date) => onChange(date)} // Ensure date selection works
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
export const MatrxDateRangePicker: React.FC<MatrxDateRangePickerProps> = ({
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
    const includeTime = formatString.toLowerCase().includes("hh") || formatString.toLowerCase().includes("p");

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
                                // Show range if both dates are selected
                                <>
                                    {formatDateForUS(value.from, includeTime)} - {formatDateForUS(value.to, includeTime)}
                                </>
                            ) : (
                                // Show "from" date if "to" is not selected yet
                                formatDateForUS(value.from, includeTime)
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
                        onSelect={(range) => onChange(range)} // Ensure range selection works
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
export const MatrxDatePickerWithPresets: React.FC<MatrxDatePickerWithPresetsProps> = ({
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
    const includeTime = formatString.toLowerCase().includes("hh") || formatString.toLowerCase().includes("p");

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
                    {value
                        ? formatDateForUS(value, includeTime) // Include time if needed
                        : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align={align}
                className="flex w-auto flex-col space-y-2 p-2"
            >
                <Select
                    onValueChange={(days) =>
                        onChange(addDays(new Date(), parseInt(days))) // Handle preset selection
                    }
                    disabled={disabled}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={presetPlaceholder} />
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
                        onSelect={(date) => onChange(date)} // Ensure date selection works
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
