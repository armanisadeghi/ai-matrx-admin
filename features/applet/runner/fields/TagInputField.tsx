import React, { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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

const TagInputField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
  source?: string;
}> = ({ field, appletId, isMobile, source="applet" }) => {
  const { 
    id, 
    label, 
    placeholder = "Type and press Enter to add tags", 
    componentProps = {},
    disabled = false,
    required = false
  } = field;
  
  const { 
    width, 
    customContent, 
    maxItems, 
    minItems = 0
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));
  
  // Local state for the input value
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize state if needed
  useEffect(() => {
    if (stateValue === undefined) {
      // Initialize with empty array
      dispatch(
        updateBrokerValue({
          source: source,
          itemId: id,
          value: [],
        })
      );
    }
  }, [stateValue, dispatch, id]);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Handle key press (Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };
  
  // Add a new tag
  const addTag = (tag: string) => {
    if (disabled) return;
    
    const tags = Array.isArray(stateValue) ? [...stateValue] : [];
    
    // Check if tag already exists
    if (tags.includes(tag)) {
      setInputValue("");
      return;
    }
    
    // Check if we're at max items
    if (maxItems !== undefined && tags.length >= maxItems) {
      return;
    }
    
    // Add the new tag
    const updatedTags = [...tags, tag];
    
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: updatedTags,
      })
    );
    
    // Reset input
    setInputValue("");
  };
  
  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    
    const tags = Array.isArray(stateValue) ? [...stateValue] : [];
    
    // Check if we're at min items
    if (minItems > 0 && tags.length <= minItems) {
      return;
    }
    
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    
    dispatch(
      updateBrokerValue({
        source: source,
        itemId: id,
        value: updatedTags,
      })
    );
  };
  
  // Handle clicking the container to focus the input
  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Check if we're at max items
  const isAtMaxItems = maxItems !== undefined && 
    Array.isArray(stateValue) && stateValue.length >= maxItems;
  
  // Check if we have validation errors
  const hasMinItemsError = required || (minItems > 0 && 
    (!Array.isArray(stateValue) || stateValue.length < minItems));
  
  const validationError = hasMinItemsError && (!Array.isArray(stateValue) || stateValue.length === 0)
    ? "Please add at least one tag."
    : hasMinItemsError
      ? `Please add at least ${minItems} tags.`
      : "";
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <div 
        className={cn(
          "flex flex-wrap gap-2 px-2 py-1.5 border rounded-md min-h-[38px] cursor-text",
          "focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-gray-600 focus-within:outline-none",
          "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800",
          validationError && "border-red-500",
          disabled && "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
        )}
        onClick={handleContainerClick}
      >
        {/* Render existing tags */}
        {Array.isArray(stateValue) && stateValue.map((tag, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700",
              "text-sm text-gray-700 dark:text-gray-300"
            )}
          >
            <span className="mr-1">{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="p-0.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        
        {/* Input field */}
        {!isAtMaxItems && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={Array.isArray(stateValue) && stateValue.length === 0 ? placeholder : ""}
            className={cn(
              "flex-grow bg-transparent outline-none min-w-[120px] py-0.5 text-gray-700 dark:text-gray-300",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500"
            )}
          />
        )}
      </div>
      
      {/* Max items message */}
      {isAtMaxItems && (
        <div className="text-amber-600 dark:text-amber-400 text-xs mt-1">
          Maximum number of tags reached ({maxItems}).
        </div>
      )}
      
      {/* Validation message */}
      {validationError && (
        <div className="text-red-500 text-xs mt-1">
          {validationError}
        </div>
      )}
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Type and press Enter to add tags.
        {maxItems !== undefined && ` Maximum: ${maxItems} tags.`}
        {minItems > 0 && ` Minimum: ${minItems} tags.`}
      </div>
    </div>
  );
};

export default TagInputField;