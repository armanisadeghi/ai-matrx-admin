import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import * as SliderPrimitive from "@radix-ui/react-slider";

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

// Multi-Thumb Slider for range selection
const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
    >
      <SliderPrimitive.Range className="absolute h-full bg-gray-400 dark:bg-gray-500" />
    </SliderPrimitive.Track>
    {/* Always render exactly 2 thumbs for range slider */}
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full border-2 border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-800 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    />
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full border-2 border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-800 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderPrimitive.Root>
));
RangeSlider.displayName = "RangeSlider";

const RangeSliderField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
  source?: string;
}> = ({ field, appletId, isMobile, source="applet" }) => {
  const { 
    id, 
    label, 
    componentProps = {},
    disabled = false,
    required = false,
    defaultValue
  } = field;
  
  const { 
    width, 
    customContent, 
    min = 0,
    max = 100,
    step = 1,
    valuePrefix = "",
    valueSuffix = ""
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));
  
  // Set up UI state for controlled sliders
  const [sliderValue, setSliderValue] = useState<[number, number]>(
    Array.isArray(stateValue) && stateValue.length === 2 
      ? [stateValue[0], stateValue[1]]
      : defaultValue !== undefined && Array.isArray(defaultValue) && defaultValue.length === 2
        ? [defaultValue[0], defaultValue[1]]
        : [min, max]
  );
  
  // Initialize state if needed
  useEffect(() => {
    if (stateValue === undefined) {
      // Initialize with default value or min/max
      const initialValue = defaultValue !== undefined && Array.isArray(defaultValue) && defaultValue.length === 2
        ? [defaultValue[0], defaultValue[1]]
        : [min, max];
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: initialValue,
        })
      );
      
      setSliderValue(initialValue as [number, number]);
    } else if (Array.isArray(stateValue) && stateValue.length === 2) {
      // Update local state when Redux state changes
      setSliderValue([stateValue[0], stateValue[1]]);
    }
  }, [stateValue, defaultValue, min, max, dispatch, id]);
  
  // Handler for slider value change
  const handleSliderChange = (newValue: number[]) => {
    if (newValue.length === 2) {
      const [newMin, newMax] = newValue;
      
      // Ensure min is always <= max
      const safeMin = Math.min(newMin, newMax);
      const safeMax = Math.max(newMin, newMax);
      
      const updatedValue: [number, number] = [safeMin, safeMax];
      setSliderValue(updatedValue);
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: updatedValue,
        })
      );
    }
  };
  
  // For direct input of min value
  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') return;
    
    const newMin = Number(inputValue);
    if (!isNaN(newMin)) {
      // Ensure new min doesn't exceed current max
      const safeMin = Math.min(newMin, sliderValue[1]);
      const updatedValue: [number, number] = [safeMin, sliderValue[1]];
      
      setSliderValue(updatedValue);
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: updatedValue,
        })
      );
    }
  };
  
  // For direct input of max value
  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') return;
    
    const newMax = Number(inputValue);
    if (!isNaN(newMax)) {
      // Ensure new max doesn't go below current min
      const safeMax = Math.max(newMax, sliderValue[0]);
      const updatedValue: [number, number] = [sliderValue[0], safeMax];
      
      setSliderValue(updatedValue);
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: updatedValue,
        })
      );
    }
  };
  
  // Check if the value is valid (within min/max bounds and min <= max)
  const isValidValue = () => {
    return (
      Array.isArray(sliderValue) &&
      sliderValue.length === 2 &&
      sliderValue[0] >= min &&
      sliderValue[1] <= max &&
      sliderValue[0] <= sliderValue[1]
    );
  };
  
  // Check if validation error
  const hasValidationError = required && !isValidValue();
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <div className="mb-6 space-y-6">
        {/* Current range display */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Range
          </span>
          <div className="flex items-center space-x-2">
            <div className="relative">
              {valuePrefix && (
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  {valuePrefix}
                </span>
              )}
              <input 
                type="number"
                value={sliderValue[0]}
                onChange={handleMinInputChange}
                min={min}
                max={sliderValue[1]}
                step={step}
                className={cn(
                  "w-20 h-8 px-2 border border-gray-300 dark:border-gray-700 rounded-md text-center text-sm",
                  "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600",
                  valuePrefix && "pl-6"
                )}
                disabled={disabled}
              />
            </div>
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <div className="relative">
              {valuePrefix && (
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  {valuePrefix}
                </span>
              )}
              <input 
                type="number"
                value={sliderValue[1]}
                onChange={handleMaxInputChange}
                min={sliderValue[0]}
                max={max}
                step={step}
                className={cn(
                  "w-20 h-8 px-2 border border-gray-300 dark:border-gray-700 rounded-md text-center text-sm",
                  "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600",
                  valuePrefix && "pl-6"
                )}
                disabled={disabled}
              />
            </div>
            {valueSuffix && (
              <span className="text-gray-500 dark:text-gray-400">
                {valueSuffix}
              </span>
            )}
          </div>
        </div>
        
        {/* Range slider component */}
        <RangeSlider
          defaultValue={sliderValue}
          value={sliderValue}
          max={max}
          min={min}
          step={step}
          disabled={disabled}
          onValueChange={handleSliderChange}
          aria-label={`${id}-range-slider`}
          className={hasValidationError ? "slider-error" : ""}
        />
        
        {/* Min/Max labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{valuePrefix}{min}{valueSuffix}</span>
          <span>{valuePrefix}{max}{valueSuffix}</span>
        </div>
      </div>
      
      {/* Validation message */}
      {hasValidationError && (
        <div className="text-red-500 text-sm mt-1">
          Please select a valid range.
        </div>
      )}
    </div>
  );
};

export default RangeSliderField;