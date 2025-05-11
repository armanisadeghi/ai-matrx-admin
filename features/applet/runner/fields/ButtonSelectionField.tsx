import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";
import ValidationMessage from "./common/ValidationMessage";

interface FieldOption {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  iconName?: string;
}

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
  options?: FieldOption[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

const ButtonSelectionField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    options = [],
    componentProps = {},
    disabled = false,
    required = false
  } = field;
  
  const { 
    width, 
    customContent, 
    multiSelect = true, // Default to true for this component
    minItems = 0,
    maxItems
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  const [touched, setTouched] = useState(false);
  
  // Initialize state if needed
  useEffect(() => {
    if (stateValue === undefined) {
      // Initialize with empty array
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: [],
        })
      );
    }
  }, [stateValue, dispatch, id]);
  
  // Handle button click
  const handleButtonClick = (optionId: string) => {
    if (disabled) return;
    
    setTouched(true);
    let updatedValue;
    
    if (multiSelect) {
      // Multi-select mode
      if (Array.isArray(stateValue)) {
        if (stateValue.includes(optionId)) {
          // If minItems is set, check if we can remove
          if (minItems > 0 && stateValue.length <= minItems) {
            return; // Don't allow removing if it would violate minItems
          }
          
          // Remove the option if already selected
          updatedValue = stateValue.filter(id => id !== optionId);
        } else {
          // If maxItems is set, check if we can add
          if (maxItems > 0 && stateValue.length >= maxItems) {
            return; // Don't allow adding if it would exceed maxItems
          }
          
          // Add the option if not already selected
          updatedValue = [...stateValue, optionId];
        }
      } else {
        // Initialize with this option
        updatedValue = [optionId];
      }
    } else {
      // Single-select mode - just set the value to the clicked option
      updatedValue = [optionId];
    }
    
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: updatedValue,
      })
    );
  };
  
  // Determine if an option is selected
  const isOptionSelected = (optionId: string) => {
    if (Array.isArray(stateValue)) {
      return stateValue.includes(optionId);
    }
    return false;
  };
  
  // Check if any option is selected
  const hasSelections = Array.isArray(stateValue) && stateValue.length > 0;
  
  // Check validation
  let validationMessage = "";
  if (required && !hasSelections) {
    validationMessage = "Please select at least one option.";
  } else if (minItems > 0 && (!hasSelections || stateValue.length < minItems)) {
    validationMessage = `Please select at least ${minItems} option${minItems !== 1 ? 's' : ''}.`;
  }
  
  let maxItemsMessage = "";
  if (maxItems > 0 && hasSelections && stateValue.length > maxItems) {
    maxItemsMessage = `Please select no more than ${maxItems} option${maxItems !== 1 ? 's' : ''}.`;
  }
  
  // Handle blur event
  const handleBlur = () => {
    setTouched(true);
  };
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <div
        role={multiSelect ? "group" : "radiogroup"}
        aria-labelledby={`${id}-label`}
        className={cn(
          "w-full",
          touched && (validationMessage || maxItemsMessage) && "border-red-500"
        )}
        onBlur={handleBlur}
      >
        <div className="flex flex-wrap gap-2">
          {options.map(option => (
            <button
              key={option.id}
              id={`${id}-${option.id}`}
              type="button"
              onClick={() => handleButtonClick(option.id)}
              disabled={disabled}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-colors border",
                isOptionSelected(option.id)
                  ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white border-blue-600 dark:border-blue-700"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750",
                "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              role={multiSelect ? "checkbox" : "radio"}
              aria-checked={isOptionSelected(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Use our ValidationMessage component */}
      <ValidationMessage
        message={validationMessage || maxItemsMessage}
        touched={touched}
      />
    </div>
  );
};

export default ButtonSelectionField;