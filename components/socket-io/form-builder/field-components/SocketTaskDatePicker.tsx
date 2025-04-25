// File location: components/socket-io/form-builder/field-components/SocketTaskDatePicker.tsx
/*
COMPONENT SCHEMA REQUIREMENTS:
{
  "fieldName": {
    "COMPONENT": "datepicker",
    "DATA_TYPE": "string", // Should be ISO string date format
    "DEFAULT": "", // Default should be empty string or ISO date string
    "REQUIRED": true/false,
    "COMPONENT_PROPS": {
      "className": "your-custom-class",
      "placeholder": "Select date", // Optional
      "disabled": false, // Optional
      "format": "yyyy-MM-dd", // Optional - default is "yyyy-MM-dd"
      "minDate": "2023-01-01", // Optional ISO date string
      "maxDate": "2025-12-31" // Optional ISO date string
    }
  }
}

The component will:
- Store ISO date string format in Redux
- Handle validation based on required field and date range
- Support test mode for automated testing
- Support light and dark mode through Tailwind classes
*/

import React, { useCallback, useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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
  selectTestMode, 
  selectTaskNameById,
  updateTaskFieldByPath 
} from "@/lib/redux/socket-io";
import { isValidField } from "@/constants/socket-schema";

interface SocketTaskDatePickerProps {
  taskId: string;
  fieldName: string;
  fieldDefinition: SchemaField;
  fullPath: string;
  initialValue: any;
  showPlaceholder?: boolean;
  propOverrides?: Record<string, any>;
}

const SocketTaskDatePicker: React.FC<SocketTaskDatePickerProps> = ({
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
  const isoDateValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));
  const testMode = useAppSelector(selectTestMode);
  const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

  // Parse the ISO date string to a Date object when available
  const date = isoDateValue ? new Date(isoDateValue) : undefined;

  // Initialize the field in Redux on component mount
  useEffect(() => {
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: initialValue }));
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
  const placeholder = showPlaceholder 
    ? finalProps.placeholder || fieldDefinition.DESCRIPTION || formatPlaceholder(fieldName) 
    : "";

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    const isoString = selectedDate?.toISOString() || "";
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: isoString }));
    
    // Validate the selected date
    if (isoString) {
      const { isValid, errorMessage } = validateField(isoString);
      setHasError(!isValid);
      setNotice(isValid ? "" : errorMessage);
    } else {
      // If required and empty, show error
      if (fieldDefinition.REQUIRED) {
        setHasError(true);
        setNotice("This field is required");
      } else {
        setHasError(false);
        setNotice("");
      }
    }
    
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              hasError ? "border-red-500 focus:ring-red-500" : "",
              "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700",
              finalProps.className || ""
            )}
            disabled={finalProps.disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            {date ? format(date, dateFormat) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
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

export default SocketTaskDatePicker; 