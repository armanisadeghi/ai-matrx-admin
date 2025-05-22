// File location: components/socket-io/form-builder/field-components/SocketTaskDateRangePicker.tsx
/*
COMPONENT SCHEMA REQUIREMENTS:
{
  "fieldName": {
    "COMPONENT": "daterangepicker",
    "DATA_TYPE": "object", // Should be an object with from/to properties
    "DEFAULT": { "from": "", "to": "" }, // Default should have from/to properties as ISO strings
    "REQUIRED": true/false,
    "COMPONENT_PROPS": {
      "className": "your-custom-class",
      "placeholder": "Select date range", // Optional
      "disabled": false, // Optional
      "format": "yyyy-MM-dd", // Optional - default is "yyyy-MM-dd"
      "minDate": "2023-01-01", // Optional ISO date string
      "maxDate": "2025-12-31", // Optional ISO date string
      "numberOfMonths": 2 // Optional - number of months to display
    }
  }
}

The component will:
- Store date range as object with from/to ISO date strings in Redux
- Handle validation based on required field and date constraints
- Support test mode for automated testing
- Support light and dark mode through Tailwind classes
*/

import React, { useCallback, useEffect, useState } from "react";
import { format, isAfter, isBefore } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SchemaField } from "@/constants/socket-schema";
import { formatPlaceholder } from "@/components/socket/utils/label-util";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
  selectFieldValue, 
  selectConnectionTestMode, 
  selectTaskNameById,
  updateTaskFieldByPath 
} from "@/lib/redux/socket-io";
import { isValidField } from "@/constants/socket-schema";

interface SocketTaskDateRangePickerProps {
  taskId: string;
  fieldName: string;
  fieldDefinition: SchemaField;
  fullPath: string;
  initialValue: any;
  showPlaceholder?: boolean;
  propOverrides?: Record<string, any>;
}

const SocketTaskDateRangePicker: React.FC<SocketTaskDateRangePickerProps> = ({
  taskId,
  fieldName,
  fieldDefinition,
  fullPath,
  initialValue,
  showPlaceholder = true,
  propOverrides = {},
}) => {
  // Create local dispatch and state hooks
  const dispatch = useAppDispatch();
  const [hasError, setHasError] = useState(false);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);

  // Get the current value from Redux store using selectors
  const rangeValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state)) || {};
  const testMode = useAppSelector(selectConnectionTestMode);
  const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

  // Parse the ISO date strings to Date objects
  const dateRange: DateRange = {
    from: rangeValue.from ? new Date(rangeValue.from) : undefined,
    to: rangeValue.to ? new Date(rangeValue.to) : undefined
  };

  // Initialize the field in Redux on component mount
  useEffect(() => {
    const defaultValue = initialValue || { from: "", to: "" };
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: defaultValue }));
  }, []);

  // Handle test mode
  useEffect(() => {
    if (testMode && fieldDefinition.TEST_VALUE !== undefined) {
      dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: fieldDefinition.TEST_VALUE }));
    }
  }, [testMode]);

  // Create validation method using the schema validator
  const validateField = useCallback(
    (value: any) => isValidField(taskName, fullPath, value),
    [taskName, fullPath]
  );

  // Process component props
  const props: Record<string, any> = {};
  const finalProps = { ...fieldDefinition.COMPONENT_PROPS, ...propOverrides };
  
  for (const [key, value] of Object.entries(finalProps)) {
    if (key === "className" && props.className) {
      props.className = cn(props.className, value as string);
    } else {
      props[key] = value;
    }
  }

  // Configure date constraints
  const minDate = finalProps.minDate ? new Date(finalProps.minDate) : undefined;
  const maxDate = finalProps.maxDate ? new Date(finalProps.maxDate) : undefined;
  const dateFormat = finalProps.format || "yyyy-MM-dd";
  const numberOfMonths = finalProps.numberOfMonths || 2;
  const placeholder = showPlaceholder 
    ? finalProps.placeholder || fieldDefinition.DESCRIPTION || formatPlaceholder(fieldName) 
    : "";

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    const newValue = {
      from: range?.from ? range.from.toISOString() : "",
      to: range?.to ? range.to.toISOString() : ""
    };
    
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: newValue }));
    
    // Validate the selected date range
    const { isValid, errorMessage } = validateField(newValue);
    setHasError(!isValid);
    setNotice(isValid ? "" : errorMessage);
    
    // If we have a complete range (both from and to), close the popover
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from) return placeholder;
    if (!dateRange.to) return `${format(dateRange.from, dateFormat)} - ?`;
    return `${format(dateRange.from, dateFormat)} - ${format(dateRange.to, dateFormat)}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange.from && "text-muted-foreground",
              hasError ? "border-red-500 focus:ring-red-500" : "",
              "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700",
              finalProps.className || ""
            )}
            disabled={finalProps.disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>{formatDateRange()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={numberOfMonths}
            disabled={(date) => 
              (minDate ? date < minDate : false) || 
              (maxDate ? date > maxDate : false)
            }
          />
        </PopoverContent>
      </Popover>
      {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
    </div>
  );
};

export default SocketTaskDateRangePicker; 