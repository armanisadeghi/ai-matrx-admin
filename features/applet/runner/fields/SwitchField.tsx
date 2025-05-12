import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import * as SwitchPrimitives from "@radix-ui/react-switch";

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

// Custom styled Switch component
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-gray-800 data-[state=unchecked]:bg-gray-200 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:data-[state=checked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 dark:bg-gray-900"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

const SwitchField: React.FC<{
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
    defaultValue
  } = field;
  
  const { 
    width, 
    customContent, 
    onLabel = "On",
    offLabel = "Off",
    direction = "horizontal"
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));
  
  // Initialize state if needed
  useEffect(() => {
    if (stateValue === undefined) {
      // Initialize with default value (default to false/off)
      const initialValue = defaultValue !== undefined ? !!defaultValue : false;
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: initialValue,
        })
      );
    }
  }, [stateValue, defaultValue, dispatch, id]);
  
  // Handler for switch toggle
  const handleToggle = (checked: boolean) => {
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: checked,
      })
    );
  };
  
  // Get the current switched state
  const isChecked = !!stateValue;
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <div 
        className={cn(
          "flex items-center",
          direction === "vertical" ? "flex-col space-y-2 items-start" : "space-x-2"
        )}
      >
        <Switch
          checked={isChecked}
          onCheckedChange={handleToggle}
          disabled={disabled}
          id={`${id}-switch`}
          aria-label={label || id}
        />
        
        <div className={cn(
          "flex items-center",
          direction === "vertical" ? "space-x-4" : "ml-2 space-x-4"
        )}>
          <span 
            className={cn(
              "text-sm transition-colors",
              isChecked 
                ? "font-medium text-gray-800 dark:text-gray-200" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            {isChecked ? onLabel : offLabel}
          </span>
        </div>
      </div>
      
      {/* Optional description if provided */}
      {field.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {field.description}
        </p>
      )}
    </div>
  );
};

export default SwitchField;