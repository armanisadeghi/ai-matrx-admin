// File location: components/socket-io/form-builder/field-components/SocketTaskTimePicker.tsx
/*
COMPONENT SCHEMA REQUIREMENTS:
{
  "fieldName": {
    "COMPONENT": "timepicker",
    "DATA_TYPE": "string", // Should be in "HH:mm" 24-hour format
    "DEFAULT": "", // Default should be empty string or time in "HH:mm" format
    "REQUIRED": true/false,
    "COMPONENT_PROPS": {
      "className": "your-custom-class",
      "placeholder": "Select time", // Optional
      "disabled": false, // Optional
      "step": 15, // Optional - minutes step (default: 15)
      "format": "hh:mm a", // Optional - display format (default: "hh:mm a" for 12h format with AM/PM)
      "use24Hours": false, // Optional - whether to use 24h format in UI (default: false)
      "minTime": "09:00", // Optional - minimum selectable time in 24h format
      "maxTime": "17:00" // Optional - maximum selectable time in 24h format
    }
  }
}

The component will:
- Store time in 24-hour "HH:mm" format in Redux
- Handle validation based on required field and time constraints
- Support test mode for automated testing
- Support light and dark mode through Tailwind classes
*/

import React, { useCallback, useEffect, useState } from "react";
import { format, parse, set } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SocketTaskTimePickerProps {
  taskId: string;
  fieldName: string;
  fieldDefinition: SchemaField;
  fullPath: string;
  initialValue: any;
  showPlaceholder?: boolean;
  propOverrides?: Record<string, any>;
}

const SocketTaskTimePicker: React.FC<SocketTaskTimePickerProps> = ({
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
  const timeValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));
  const testMode = useAppSelector(selectConnectionTestMode);
  const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

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

  // Parse current time value into hours and minutes
  let hours = 0;
  let minutes = 0;
  if (timeValue && typeof timeValue === 'string') {
    const timeParts = timeValue.split(':');
    if (timeParts.length === 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
  }

  // Set up time constraints
  const step = finalProps.step || 15;
  const use24Hours = finalProps.use24Hours === true;
  const displayFormat = finalProps.format || (use24Hours ? "HH:mm" : "hh:mm a");
  const placeholder = showPlaceholder 
    ? finalProps.placeholder || fieldDefinition.DESCRIPTION || formatPlaceholder(fieldName) 
    : "";

  // Parse min/max time constraints
  let minHours = 0, minMinutes = 0, maxHours = 23, maxMinutes = 59;
  
  if (finalProps.minTime && typeof finalProps.minTime === 'string') {
    const minTimeParts = finalProps.minTime.split(':');
    if (minTimeParts.length === 2) {
      minHours = parseInt(minTimeParts[0], 10);
      minMinutes = parseInt(minTimeParts[1], 10);
    }
  }
  
  if (finalProps.maxTime && typeof finalProps.maxTime === 'string') {
    const maxTimeParts = finalProps.maxTime.split(':');
    if (maxTimeParts.length === 2) {
      maxHours = parseInt(maxTimeParts[0], 10);
      maxMinutes = parseInt(maxTimeParts[1], 10);
    }
  }

  // Generate hours options
  const hoursOptions = () => {
    const options = [];
    const startHour = use24Hours ? 0 : 1;
    const endHour = use24Hours ? 23 : 12;
    
    for (let i = startHour; i <= endHour; i++) {
      options.push({
        value: i.toString().padStart(2, '0'),
        label: i.toString().padStart(2, '0')
      });
    }
    return options;
  };

  // Generate minutes options based on step
  const minutesOptions = () => {
    const options = [];
    for (let i = 0; i < 60; i += step) {
      options.push({
        value: i.toString().padStart(2, '0'),
        label: i.toString().padStart(2, '0')
      });
    }
    return options;
  };

  // Generate period options (AM/PM)
  const periodOptions = [
    { value: 'am', label: 'AM' },
    { value: 'pm', label: 'PM' }
  ];

  // Determine current period for 12h format
  const getPeriod = () => {
    return hours >= 12 ? 'pm' : 'am';
  };

  // Convert 24h to 12h format for display
  const get12HourFormat = (hour: number) => {
    if (hour === 0) return 12;
    if (hour > 12) return hour - 12;
    return hour;
  };

  // Format time for display
  const formatTimeForDisplay = () => {
    if (!timeValue) return placeholder;
    
    try {
      // Create a base date to apply time to
      const baseDate = new Date();
      baseDate.setHours(hours, minutes, 0, 0);
      return format(baseDate, displayFormat);
    } catch (error) {
      return timeValue;
    }
  };

  // Update time value in Redux
  const updateTime = (newHours: number, newMinutes: number) => {
    const timeString = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: timeString }));
    
    // Validate the time
    const { isValid, errorMessage } = validateField(timeString);
    setHasError(!isValid);
    setNotice(isValid ? "" : errorMessage);
  };

  // Handle hour change
  const handleHourChange = (value: string) => {
    let newHours = parseInt(value, 10);
    
    // If using 12h format, adjust hours based on period
    if (!use24Hours) {
      const period = getPeriod();
      if (period === 'pm' && newHours < 12) {
        newHours += 12;
      } else if (period === 'am' && newHours === 12) {
        newHours = 0;
      }
    }
    
    updateTime(newHours, minutes);
  };

  // Handle minute change
  const handleMinuteChange = (value: string) => {
    const newMinutes = parseInt(value, 10);
    updateTime(hours, newMinutes);
  };

  // Handle period change (AM/PM)
  const handlePeriodChange = (value: string) => {
    let newHours = hours;
    if (value === 'am' && hours >= 12) {
      newHours -= 12;
    } else if (value === 'pm' && hours < 12) {
      newHours += 12;
    }
    
    updateTime(newHours, minutes);
  };

  // Check if a time is selectable based on min/max constraints
  const isTimeSelectable = (h: number, m: number) => {
    const time = h * 60 + m;
    const minTime = minHours * 60 + minMinutes;
    const maxTime = maxHours * 60 + maxMinutes;
    
    return time >= minTime && time <= maxTime;
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !timeValue && "text-muted-foreground",
              hasError ? "border-red-500 focus:ring-red-500" : "",
              "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700",
              finalProps.className || ""
            )}
            disabled={finalProps.disabled}
          >
            <Clock className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>{formatTimeForDisplay()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 bg-white dark:bg-slate-800">
          <div className="flex items-center space-x-2">
            <Select
              value={use24Hours ? hours.toString().padStart(2, '0') : get12HourFormat(hours).toString().padStart(2, '0')}
              onValueChange={handleHourChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent>
                {hoursOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-slate-600 dark:text-slate-400">:</span>
            <Select
              value={minutes.toString().padStart(2, '0')}
              onValueChange={handleMinuteChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent>
                {minutesOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!use24Hours && (
              <Select
                value={getPeriod()}
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="AM/PM" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
    </div>
  );
};

export default SocketTaskTimePicker; 