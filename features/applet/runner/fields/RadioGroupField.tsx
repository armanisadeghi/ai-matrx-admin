import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";
import { FieldDefinition, FieldOption } from "@/types/customAppTypes";

// Import the shadcn/ui components
import { Input } from "@/components/ui/input";

// Define the type for selected option in state
export interface SelectedOptionValue extends FieldOption {
  selected: boolean;
  otherText?: string;
}

const RadioGroupField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
  source?: string;
  disabled?: boolean;
}> = ({ field, appletId, isMobile, source="applet", disabled=false }) => {
  const { 
    id, 
    label, 
    options,
    componentProps,
    includeOther = false,
    required
  } = field;
  
  const { 
    width, 
    customContent, 
    direction = "vertical",
    gridCols = "grid-cols-1"
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));
  
  const [otherText, setOtherText] = useState("");
  const [touched, setTouched] = useState(false);
  
  // Initialize stateValue if not set
  useEffect(() => {
    if (!stateValue && options.length > 0) {
      // Initialize with all options having selected: false
      const initialOptions = options.map(option => ({
        ...option,
        selected: false
      }));
      
      // Add Other option if includeOther is true
      if (includeOther) {
        initialOptions.push({
          id: "other",
          label: "Other",
          selected: false,
          description: ""
        });
      }
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: initialOptions,
        })
      );
    } else if (stateValue) {
      // If there's an "other" option and it's selected, initialize the otherText state
      const otherOption = Array.isArray(stateValue) ? stateValue.find((opt: SelectedOptionValue) => opt.id === "other") : null;
      if (otherOption && otherOption.selected && otherOption.description) {
        setOtherText(otherOption.description);
      }
    }
  }, [stateValue, options, includeOther, dispatch, id]);
  
  // Handler for selecting a radio option
  const handleSelectOption = (optionId: string) => {
    if (disabled) return;
    
    // Radio is single-select, so set only one to selected
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => ({
      ...option,
      selected: option.id === optionId
    }));
    
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: updatedOptions,
      })
    );
  };
  
  // Handler for "Other" text input
  const handleOtherTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOtherText = e.target.value;
    setOtherText(newOtherText);
    
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => {
      if (option.id === "other") {
        return {
          ...option,
          description: newOtherText
        };
      }
      return option;
    });
    
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: updatedOptions,
      })
    );
  };
  
  // Handle blur event for the radio group
  const handleBlur = () => {
    setTouched(true);
  };
  
  // Get the currently selected option
  const selectedOption = Array.isArray(stateValue) 
    ? stateValue.find((option: SelectedOptionValue) => option.selected) 
    : null;
  
  const isOtherSelected = selectedOption?.id === "other";
  
  // Check if any option is selected
  const hasSelection = selectedOption !== undefined && selectedOption !== null;
  
  // Check if validation error (required but nothing selected)
  const hasValidationError = required && !hasSelection;
  const showValidationError = touched && hasValidationError;
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  // Prepare options list including "Other" option if needed
  const selectWithOptions = [...options];
  if (includeOther) {
    selectWithOptions.push({ id: "other", label: "Other" });
  }
  
  // Determine if we're using a grid layout or direction-based layout
  const useGrid = gridCols !== "grid-cols-1" && direction === "vertical";
  
  // Create radio items
  const radioItems = selectWithOptions.map((option) => {
    const isSelected = selectedOption?.id === option.id;
    
    return (
      <div
        key={option.id}
        className={cn(
          "flex items-start mb-2",
          direction === "horizontal" && !useGrid ? "inline-flex mr-4" : "flex"
        )}
      >
        <div className="flex items-center h-5 mt-0.5">
          <div
            className={cn(
              "relative flex items-center justify-center w-4 h-4 border rounded-full mr-2 cursor-pointer transition-all duration-200",
              isSelected
                ? "border-blue-600 dark:border-blue-500"
                : "border-gray-300 dark:border-gray-600",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleSelectOption(option.id)}
            role="radio"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!disabled && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                handleSelectOption(option.id);
              }
            }}
          >
            {isSelected && (
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200" />
            )}
          </div>
        </div>
        <div
          className={cn(
            "text-gray-700 dark:text-gray-300 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && handleSelectOption(option.id)}
        >
          <label 
            className="cursor-pointer select-none"
            htmlFor={`${appletId}-${id}-${option.id}`}
          >
            {option.label}
          </label>
          {option.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {option.description}
            </p>
          )}
        </div>
      </div>
    );
  });
  
  return (
    <div className={`${safeWidthClass}`}>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className={cn(
          "w-full",
          showValidationError && "border-red-500"
        )}
        onBlur={handleBlur}
      >
        {useGrid ? (
          // Grid layout
          <div className={cn(
            "grid gap-2",
            gridCols,
            "p-1"
          )}>
            {radioItems}
          </div>
        ) : (
          // Direction-based layout (vertical or horizontal)
          <div className={cn(
            "flex flex-wrap",
            direction === "vertical" && "flex-col",
            "p-1"
          )}>
            {radioItems}
          </div>
        )}
      </div>
      
      {/* Other text input */}
      {isOtherSelected && (
        <Input
          id={`${appletId}-${id}-other-input`}
          className="w-full mt-2 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
          value={otherText}
          onChange={handleOtherTextChange}
          placeholder="Please specify..."
          disabled={disabled}
          onBlur={handleBlur}
        />
      )}
      
      {/* Validation message - only show after touched */}
      {showValidationError && (
        <div className="text-red-500 text-sm mt-1">
          Please select an option.
        </div>
      )}
    </div>
  );
};

export default RadioGroupField;