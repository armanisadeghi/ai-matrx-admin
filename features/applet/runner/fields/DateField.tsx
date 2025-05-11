import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComponentProps {
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  minDate?: string;
  maxDate?: string;
  onLabel?: string;
  offLabel?: string;
  multiSelect?: boolean;
  maxItems?: number;
  minItems?: number;
  gridCols?: string;
  autoComplete?: string;
  direction?: "vertical" | "horizontal";
  customContent?: React.ReactNode;
  showSelectAll?: boolean;
  width?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxLength?: number;
  spellCheck?: boolean;
}

interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  group?: string;
  iconName?: string;
  component: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: any[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

const DateField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    placeholder = "Select a date", 
    componentProps = {},
    disabled = false,
    required = false
  } = field;
  
  const { 
    width, 
    customContent, 
    minDate = "",
    maxDate = "",
    valuePrefix = "",
    valueSuffix = ""
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  // Process min and max dates
  const processDateLimit = (dateLimit: string): Date | undefined => {
    if (!dateLimit) return undefined;
    
    if (dateLimit.toLowerCase() === 'today') {
      return new Date();
    }
    
    const parsedDate = new Date(dateLimit);
    // Check if the date is valid
    return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
  };
  
  const minDateLimit = processDateLimit(minDate);
  const maxDateLimit = processDateLimit(maxDate);
  
  // Handler for date selection
  const handleDateSelect = (date: Date | undefined) => {
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: date ? date.toISOString() : null,
      })
    );
  };
  
  // Parse date from state if available
  const selectedDate = stateValue ? new Date(stateValue) : undefined;
  const isValidDate = selectedDate && !isNaN(selectedDate.getTime());
  
  // Check if validation error (required but no date selected)
  const hasValidationError = required && !isValidDate;
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !isValidDate && "text-gray-500 dark:text-gray-400",
              "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
              hasValidationError && "border-red-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {isValidDate ? (
              <span>{valuePrefix} {format(selectedDate as Date, 'PPP')} {valueSuffix}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
          <Calendar
            mode="single"
            selected={isValidDate ? selectedDate : undefined}
            onSelect={handleDateSelect}
            initialFocus
            disabled={disabled}
            fromDate={minDateLimit}
            toDate={maxDateLimit}
            className="border-none"
          />
        </PopoverContent>
      </Popover>
      
      {/* Validation message */}
      {hasValidationError && (
        <div className="text-red-500 text-sm mt-1">
          Please select a date.
        </div>
      )}
    </div>
  );
};

export default DateField;