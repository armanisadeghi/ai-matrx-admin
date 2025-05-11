import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

// Import the new SelectionPills component
import SelectionPills from "./common/SelectionPills";

// Define the type for selected option in state
export interface SelectedOptionValue extends FieldOption {
  selected: boolean;
  otherText?: string;
}

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
  gridCols?: number;
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

const DirectMultiSelectField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    placeholder = "Search options...", 
    options = [],
    componentProps = {},
    disabled = false,
    includeOther = false
  } = field;
  
  const { 
    width, 
    customContent, 
    maxItems, 
    minItems,
    rows = 5,
    showSelectAll = false 
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  const [searchQuery, setSearchQuery] = useState("");
  const [otherText, setOtherText] = useState("");
  
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
          source: "applet",
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
  
  // Handler for toggling a selection
  const toggleOption = (optionId: string) => {
    // Don't allow toggling if disabled
    if (disabled) return;
    
    // Update the selection state for the specific option
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => {
      if (option.id === optionId) {
        // Check if we're trying to unselect while below minItems
        if (option.selected && minItems) {
          const selectedCount = stateValue.filter((o: SelectedOptionValue) => o.selected).length;
          if (selectedCount <= minItems) {
            return option; // Don't allow unselecting if it would violate minItems
          }
        }
        
        // Check if we're trying to select while at maxItems
        if (!option.selected && maxItems) {
          const selectedCount = stateValue.filter((o: SelectedOptionValue) => o.selected).length;
          if (selectedCount >= maxItems) {
            return option; // Don't allow selecting if it would violate maxItems
          }
        }
        
        return {
          ...option,
          selected: !option.selected
        };
      }
      return option;
    });
    
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: updatedOptions,
      })
    );
  };
  
  // Handler for select all
  const toggleSelectAll = () => {
    if (disabled) return;
    
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
    if (maxItems && !areAllSelected && selectWithOptions.length > maxItems) {
      // Only select up to maxItems options
      const limitedOptions = updatedOptions.map((option, index) => ({
        ...option,
        selected: index < maxItems
      }));
      
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: limitedOptions,
        })
      );
      return;
    }
    
    dispatch(
      updateBrokerValue({
        source: "applet",
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
        source: "applet",
        itemId: id,
        value: updatedOptions,
      })
    );
  };
  
  // Get the currently selected options
  const selectedOptions = Array.isArray(stateValue) 
    ? stateValue.filter((option: SelectedOptionValue) => option.selected)
    : [];
  
  const isOtherSelected = selectedOptions.some(option => option.id === "other");
  
  // Determine if we have any validation issues
  const hasMinItemsError = minItems && selectedOptions.length < minItems;
  const hasMaxItemsError = maxItems && selectedOptions.length > maxItems;
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  // Prepare options list including "Other" option if needed
  const selectWithOptions = [...options];
  if (includeOther) {
    selectWithOptions.push({ id: "other", label: "Other" });
  }

  // Filter options based on search query
  const filteredOptions = selectWithOptions.filter(option => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const matchLabel = option.label.toLowerCase().includes(query);
    const matchDescription = option.description?.toLowerCase().includes(query) || false;
    
    return matchLabel || matchDescription;
  });
  
  // Calculate the height based on the rows prop (each row is approx 36px)
  const scrollHeight = Math.min(rows * 36, 300); // Cap at 300px max height
  
  // Handler for clearing all selections
  const handleClearAll = () => {
    const clearedOptions = (stateValue || []).map((option: SelectedOptionValue) => ({
      ...option,
      selected: false
    }));
    
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: clearedOptions,
      })
    );
  };
  
  return (
    <div className={`${safeWidthClass}`}>
      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Input
          placeholder={placeholder}
          className="pl-8 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
      </div>
      
      {/* Scrollable options area */}
      <div className={cn(
        "border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800",
        disabled && "opacity-60"
      )}>
        {showSelectAll && (
          <div
            className={cn(
              "flex items-center relative cursor-pointer select-none py-1.5 px-2 border-b border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300",
              !disabled && "hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            onClick={toggleSelectAll}
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
            <div className={cn(
              "flex h-4 w-4 items-center justify-center rounded-sm border border-gray-300 dark:border-gray-700 mr-2",
              selectWithOptions.every(option => {
                const stateOption = stateValue?.find((o: SelectedOptionValue) => o.id === option.id);
                return stateOption?.selected;
              }) && "bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500"
            )}>
              {selectWithOptions.every(option => {
                const stateOption = stateValue?.find((o: SelectedOptionValue) => o.id === option.id);
                return stateOption?.selected;
              }) && <Check className="h-3 w-3" />}
            </div>
            <span className="font-semibold">Select All</span>
          </div>
        )}
        
        <ScrollArea style={{ height: `${scrollHeight}px` }} className="rounded-md">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No options found.
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = selectedOptions.some(selectedOpt => selectedOpt.id === option.id);
                
                return (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center relative cursor-pointer select-none py-1.5 px-2 rounded-sm text-gray-700 dark:text-gray-300 my-1",
                      !disabled && "hover:bg-gray-100 dark:hover:bg-gray-700",
                      isSelected && "bg-gray-100 dark:bg-gray-700"
                    )}
                    onClick={() => toggleOption(option.id)}
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
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-gray-300 dark:border-gray-700 mr-2",
                      isSelected && "bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500"
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{option.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
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
        />
      )}
      
      {/* Selected items display using the new SelectionPills component */}
      <SelectionPills
        selectedOptions={selectedOptions}
        onRemove={toggleOption}
        onClearAll={selectedOptions.length > 1 ? handleClearAll : undefined}
        disabled={disabled}
      />
      
      {/* Validation messages */}
      {(hasMinItemsError || hasMaxItemsError) && (
        <div className="text-red-500 text-sm mt-1">
          {hasMinItemsError && `Please select at least ${minItems} options.`}
          {hasMaxItemsError && `Please select no more than ${maxItems} options.`}
        </div>
      )}
    </div>
  );
};

export default DirectMultiSelectField;