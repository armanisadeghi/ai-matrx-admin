import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDefinition, FieldOption } from "@/types/customAppTypes";
// Import the shadcn/ui components
import { Input } from "@/components/ui/input";

// Import the SelectionPills component
import SelectionPills from "./common/SelectionPills";
import ValidationMessage from "./common/ValidationMessage";

// Define the type for selected option in state
export interface SelectedOptionValue extends FieldOption {
  selected: boolean;
  otherText?: string;
}

const CheckboxGroupField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
  source?: string;
  disabled?: boolean;
  className?: string; // Add this new prop
}> = ({ field, appletId, isMobile, source="applet", disabled=false, className="" }) => {
  const { 
    id, 
    label, 
    options,
    componentProps,
    includeOther,
    required
  } = field;
  
  const { 
    width, 
    customContent, 
    direction = "vertical",
    gridCols = "grid-cols-1",
    minItems = 0,
    maxItems = 0,
    showSelectAll = false
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
  
  // Handler for toggling a checkbox
  const toggleOption = (optionId: string) => {
    if (disabled) return;
    
    setTouched(true);
    
    // Get current selection state
    const currentOption = Array.isArray(stateValue) ? stateValue.find((o: SelectedOptionValue) => o.id === optionId) : undefined;
    const isCurrentlySelected = currentOption?.selected || false;
    
    // Count currently selected items
    const selectedCount = stateValue?.filter((o: SelectedOptionValue) => o.selected).length || 0;
    
    // Check if we're trying to deselect while at minItems
    if (isCurrentlySelected && minItems > 0 && selectedCount <= minItems) {
      return; // Don't allow deselect if it would violate minItems
    }
    
    // Check if we're trying to select while at maxItems
    if (!isCurrentlySelected && maxItems > 0 && selectedCount >= maxItems) {
      return; // Don't allow select if it would violate maxItems
    }
    
    // Update the selection state for the specific option
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => {
      if (option.id === optionId) {
        return {
          ...option,
          selected: !option.selected
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
  
  // Handler for select all
  const toggleSelectAll = () => {
    if (disabled) return;
    
    setTouched(true);
    
    // Check how many are currently selected
    const areAllSelected = selectWithOptions.every(option => {
      const stateOption = stateValue?.find((o: SelectedOptionValue) => o.id === option.id);
      return stateOption?.selected;
    });
    
    // Toggle all options
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => ({
      ...option,
      selected: !areAllSelected
    }));
    
    // If maxItems is set, limit the number of selected items
    if (maxItems > 0 && !areAllSelected && selectWithOptions.length > maxItems) {
      // Only select up to maxItems options
      const limitedOptions = updatedOptions.map((option, index) => ({
        ...option,
        selected: index < maxItems
      }));
      
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: limitedOptions,
        })
      );
      return;
    }
    
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
  
  // Handler for blur events
  const handleBlur = () => {
    setTouched(true);
  };
  
  // Get the selected options
  const selectedOptions = Array.isArray(stateValue) 
    ? stateValue.filter((option: SelectedOptionValue) => option.selected)
    : [];
  
  const isOtherSelected = selectedOptions.some(option => option.id === "other");
  
  // Check validation
  let validationMessage = "";
  
  if (required && selectedOptions.length === 0) {
    validationMessage = "Please select at least one option.";
  } else if (minItems > 0 && selectedOptions.length < minItems) {
    validationMessage = `Please select at least ${minItems} option${minItems !== 1 ? 's' : ''}.`;
  }
  
  let maxItemsMessage = "";
  if (maxItems > 0 && selectedOptions.length > maxItems) {
    maxItemsMessage = `Please select no more than ${maxItems} option${maxItems !== 1 ? 's' : ''}.`;
  }
  
  // Handler for clearing all selections
  const handleClearAll = () => {
    if (disabled) return;
    
    const clearedOptions = (stateValue || []).map((option: SelectedOptionValue) => ({
      ...option,
      selected: false
    }));
    
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: clearedOptions,
      })
    );
  };
  
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
  
  // Create checkbox items
  const checkboxItems = selectWithOptions.map((option) => {
    const isSelected = selectedOptions.some(selectedOpt => selectedOpt.id === option.id);
    
    return (
      <div
        key={option.id}
        className={cn(
          "flex items-start my-1 transition-colors",
          direction === "horizontal" && !useGrid ? "inline-flex mr-4" : "flex"
        )}
      >
        <div className="flex items-center h-5 mt-0.5">
          <div
            className={cn(
              "relative flex items-center justify-center w-4 h-4 border rounded mr-2 cursor-pointer",
              isSelected
                ? "bg-gray-200 dark:bg-gray-700 border-gray-500 dark:border-gray-400"
                : "border-gray-300 dark:border-gray-600",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => toggleOption(option.id)}
            onBlur={handleBlur}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!disabled && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                toggleOption(option.id);
              }
            }}
          >
            {isSelected && (
              <Check className="h-3 w-3 text-gray-700 dark:text-gray-300" />
            )}
          </div>
        </div>
        <div
          className={cn(
            "text-gray-700 dark:text-gray-300 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && toggleOption(option.id)}
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
    <div className={`${safeWidthClass} ${className}`}>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className={cn(
          "w-full",
          touched && (validationMessage || maxItemsMessage) && "border-red-500"
        )}
        onBlur={handleBlur}
      >
        {showSelectAll && (
          <div
            className={cn(
              "flex items-center py-1 mb-2 border-b border-gray-200 dark:border-gray-700",
              disabled && "opacity-50"
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-center w-4 h-4 border rounded mr-2 cursor-pointer",
                selectWithOptions.every(option => {
                  const stateOption = stateValue?.find((o: SelectedOptionValue) => o.id === option.id);
                  return stateOption?.selected;
                })
                  ? "bg-gray-200 dark:bg-gray-700 border-gray-500 dark:border-gray-400"
                  : "border-gray-300 dark:border-gray-600",
                disabled && "cursor-not-allowed"
              )}
              onClick={toggleSelectAll}
              onBlur={handleBlur}
              role="checkbox"
              aria-checked={selectWithOptions.every(option => {
                const stateOption = stateValue?.find((o: SelectedOptionValue) => o.id === option.id);
                return stateOption?.selected;
              })}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  toggleSelectAll();
                }
              }}
            >
              {selectWithOptions.every(option => {
                const stateOption = stateValue?.find((o: SelectedOptionValue) => o.id === option.id);
                return stateOption?.selected;
              }) && (
                <Check className="h-3 w-3 text-gray-700 dark:text-gray-300" />
              )}
            </div>
            <label className="font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
              Select All
            </label>
          </div>
        )}
        
        {useGrid ? (
          // Grid layout
          <div className={cn(
            "grid gap-2",
            gridCols,
            "p-1"
          )}>
            {checkboxItems}
          </div>
        ) : (
          // Direction-based layout (vertical or horizontal)
          <div className={cn(
            "flex flex-wrap",
            direction === "vertical" && "flex-col",
            "p-1"
          )}>
            {checkboxItems}
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
          onBlur={handleBlur}
          placeholder="Please specify..."
          disabled={disabled}
        />
      )}
      
      {/* Selected items display using the SelectionPills component */}
      <SelectionPills
        selectedOptions={selectedOptions}
        onRemove={toggleOption}
        onClearAll={selectedOptions.length > 1 ? handleClearAll : undefined}
        disabled={disabled}
      />
      
      {/* Use our new ValidationMessage component */}
      <ValidationMessage 
        message={validationMessage || maxItemsMessage} 
        touched={touched}
      />
    </div>
  );
};

export default CheckboxGroupField;