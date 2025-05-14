import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { FieldDefinition } from "@/types/customAppTypes";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FieldValidation, useFieldValidation } from "./common/FieldValidation";
  
const DateRangePicker: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
  source?: string;
  disabled?: boolean;
}> = ({ field, appletId, isMobile, source="applet", disabled=false }) => {
  const { 
    id, 
    placeholder, 
    componentProps,
    required
  } = field;
  
  const { 
    width, 
    customContent, 
    minDate,
    maxDate
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));
  
  // Use the validation hook
  const { handleBlur, showValidation } = useFieldValidation();
  
  // Process min and max dates
  const processDateLimit = (dateLimit: string): Date | undefined => {
    if (!dateLimit) return undefined;
    
    if (dateLimit.toLowerCase() === 'today') {
      return new Date();
    }
    
    const parsedDate = new Date(dateLimit);
    return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
  };
  
  const minDateLimit = processDateLimit(minDate);
  const maxDateLimit = processDateLimit(maxDate);
  
  // Parse date range from state if available
  let dateRange: DateRange | undefined;
  if (stateValue) {
    try {
      const parsedValue = typeof stateValue === 'string' ? JSON.parse(stateValue) : stateValue;
      dateRange = {
        from: parsedValue.from ? new Date(parsedValue.from) : undefined,
        to: parsedValue.to ? new Date(parsedValue.to) : undefined
      };
      
      // Validate dates
      if (dateRange.from && isNaN(dateRange.from.getTime())) dateRange.from = undefined;
      if (dateRange.to && isNaN(dateRange.to.getTime())) dateRange.to = undefined;
      
      // If both dates are invalid, reset the range
      if (!dateRange.from && !dateRange.to) dateRange = undefined;
    } catch (error) {
      // If parsing fails, assume no valid date range
      dateRange = undefined;
    }
  }
  
  // Handler for date range selection
  const handleDateSelect = (range: DateRange | undefined) => {
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: range ? JSON.stringify({
          from: range.from ? range.from.toISOString() : null,
          to: range.to ? range.to.toISOString() : null
        }) : null,
      })
    );
  };
  
  // Determine if value is valid for validation purposes
  const hasValidValue = dateRange && dateRange.from;
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={safeWidthClass} onBlur={handleBlur}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full pl-3 text-left font-normal flex items-center justify-between",
              (!dateRange || !dateRange.from) && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <span>
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                placeholder
              )}
            </span>
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateSelect}
            disabled={disabled}
            fromDate={minDateLimit}
            toDate={maxDateLimit}
            initialFocus
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      
      <FieldValidation
        value={hasValidValue ? dateRange : null}
        required={required}
        showValidation={showValidation}
        fieldType="date range"
      />
    </div>
  );
};

export default DateRangePicker;