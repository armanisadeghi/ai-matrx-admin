import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { CheckboxGroupFieldConfig, FieldProps, CheckboxOption } from './types';

// Define the enhanced option type with selection state
interface EnhancedCheckboxOption extends CheckboxOption {
  selected: boolean;
}

// Extended props interface with optional notification callbacks
interface ExtendedCheckboxGroupProps extends FieldProps<CheckboxGroupFieldConfig> {
  onOtherSelected?: (isSelected: boolean, otherValue?: string) => void;
  onOtherValueChange?: (value: string) => void;
}

// Helper function to notify parent containers about size changes
const notifyParentOfResize = () => {
  // Dispatch a resize event after a short delay to allow DOM to update
  setTimeout(() => {
    // Create and dispatch a custom event that parent containers can listen for
    const resizeEvent = new CustomEvent('checkboxGroupResize');
    window.dispatchEvent(resizeEvent);
    
    // Also dispatch a standard resize event as a fallback
    window.dispatchEvent(new Event('resize'));
  }, 50);
};

const CheckboxGroupField: React.FC<ExtendedCheckboxGroupProps> = ({
  id,
  label,
  defaultValue = [],
  onValueChange,
  customConfig = {},
  customContent = null,
  isMobile = false,
  onOtherSelected,
  onOtherValueChange,
}) => {
  // Extract config options with defaults
  const {
    options = [],
    includeOther = false,
    otherPlaceholder = "Please specify...",
    width = "w-full",
    direction = "auto", // Default to auto now
    checkboxClassName = "rounded-sm border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-none dark:bg-gray-800",
    minOptionWidth = 180, // Default minimum width for each option
  } = customConfig as CheckboxGroupFieldConfig;

  // Calculate columns based on container width
  const [columns, setColumns] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use value broker for managing the selected values
  const { currentValue, setValue } = useValueBroker(id);
  
  // Track "Other" text input separately
  const [otherValue, setOtherValue] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  
  // Create a local state to ensure component updates on selection changes
  const [localOptions, setLocalOptions] = useState<EnhancedCheckboxOption[]>([]);
  
  // Track initialization state to prevent loops
  const [isInitialized, setIsInitialized] = useState(false);

  // Function to calculate optimal column count
  const calculateColumns = useCallback(() => {
    if (direction !== 'auto' || !containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const optimalColumns = Math.floor(containerWidth / minOptionWidth);
    
    // Ensure at least 1 column, but no more than needed for the options
    const newColumnCount = Math.max(1, Math.min(optimalColumns, options.length));
    setColumns(newColumnCount);
  }, [direction, options.length, minOptionWidth]);

  // Calculate columns on mount and window resize
  useEffect(() => {
    if (direction === 'auto') {
      calculateColumns();
      
      const handleResize = () => {
        calculateColumns();
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else if (direction === 'horizontal') {
      // For horizontal, use flexible layout
      setColumns(0); // Special value for flex layout
    } else {
      // For vertical, use single column
      setColumns(1);
    }
  }, [direction, calculateColumns]);

  // Initialize the component once on mount
  useEffect(() => {
    if (isInitialized) {
      return; // Skip if already initialized
    }
    
    // Create enhanced options with selection state
    const initialOptions: EnhancedCheckboxOption[] = options.map(option => ({
      ...option,
      selected: Array.isArray(defaultValue) && defaultValue.includes(option.value)
    }));

    // Add "other" option if enabled (will be rendered separately)
    if (includeOther) {
      let hasOtherSelected = false;
      let otherCustomValue = '';
      
      // Check if there's a custom "other" value
      if (Array.isArray(defaultValue)) {
        // Check if "other" is directly selected
        hasOtherSelected = defaultValue.includes('other');
        
        // Look for a custom "other" value (not in the predefined options)
        const customValue = defaultValue.find(val => 
          !options.some(opt => opt.value === val) && val !== 'other'
        );
        
        if (customValue) {
          hasOtherSelected = true;
          otherCustomValue = customValue;
          setOtherValue(customValue);
          setShowOtherInput(true);
          
          // Notify parent about other selection if callback exists
          if (onOtherSelected) {
            onOtherSelected(true, customValue);
          }
        } else {
          setShowOtherInput(hasOtherSelected);
          
          // Notify parent about other selection if callback exists
          if (hasOtherSelected && onOtherSelected) {
            onOtherSelected(true);
          }
        }
      }
      
      // Add the "other" option with the custom value in the label if available
      initialOptions.push({
        id: 'other',
        value: 'other',
        label: otherCustomValue ? `Other: ${otherCustomValue}` : 'Other',
        selected: hasOtherSelected
      });
    }
    
    // Set local options
    setLocalOptions(initialOptions);
    
    // Initialize the value broker if needed
    if (currentValue === null) {
      setValue(initialOptions);
    } else if (Array.isArray(currentValue)) {
      // Use existing value from broker
      setLocalOptions(currentValue);
      
      // Check if "other" is selected in the current value
      const otherOption = currentValue.find(option => option.value === 'other');
      if (otherOption && otherOption.selected) {
        setShowOtherInput(true);
        
        // Extract the custom value from the label if it exists
        const labelMatch = otherOption.label.match(/^Other: (.+)$/);
        if (labelMatch && labelMatch[1]) {
          const extractedValue = labelMatch[1];
          setOtherValue(extractedValue);
          
          // Notify parent about other selection if callback exists
          if (onOtherSelected) {
            onOtherSelected(true, extractedValue);
          }
        } else if (onOtherSelected) {
          onOtherSelected(true);
        }
      }
    }
    
    setIsInitialized(true);
  }, [options, defaultValue, includeOther, currentValue, setValue, isInitialized, onOtherSelected]);

  // Handle checkbox change using local state
  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, optionValue: string) => {
    const isChecked = e.target.checked;
    
    // Update the local state first
    const updatedOptions = localOptions.map(option => {
      if (option.value === optionValue) {
        return { ...option, selected: isChecked };
      }
      return option;
    });
    
    // Handle "other" option specially
    if (optionValue === 'other') {
      setShowOtherInput(isChecked);
      
      // If "other" is being unchecked, reset the custom text in the label
      if (!isChecked) {
        updatedOptions.forEach(option => {
          if (option.value === 'other') {
            option.label = 'Other';
          }
        });
        
        // Notify parent that other is deselected
        if (onOtherSelected) {
          onOtherSelected(false);
        }
      } else if (otherValue) {
        // If "other" is being checked and we already have a value, set it in the label
        updatedOptions.forEach(option => {
          if (option.value === 'other') {
            option.label = `Other: ${otherValue}`;
          }
        });
        
        // Notify parent that other is selected with a value
        if (onOtherSelected) {
          onOtherSelected(true, otherValue);
        }
      } else if (onOtherSelected) {
        // Other is selected but no value yet
        onOtherSelected(true);
      }
    }
    
    // Update local state for immediate UI update
    setLocalOptions(updatedOptions);
    
    // Update the value broker
    setValue(updatedOptions);
    
    // Call onValueChange with the updated values
    if (onValueChange) {
      onValueChange(updatedOptions);
    }
  }, [localOptions, setValue, onValueChange, otherValue, onOtherSelected]);

  // Handle "Other" input change
  const handleOtherInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOtherValue(value);
    
    // Update the "other" option with the custom text as part of the label
    const updatedOptions = localOptions.map(option => {
      if (option.value === 'other') {
        return { 
          ...option, 
          // Store original "Other" label and the custom value in the label field
          label: value ? `Other: ${value}` : 'Other'
        };
      }
      return option;
    });
    
    // Update local state
    setLocalOptions(updatedOptions);
    
    // Update the broker value
    setValue(updatedOptions);
    
    // Notify parent about other value change if callback exists
    if (onOtherValueChange) {
      onOtherValueChange(value);
    }
    
    // Call onValueChange with updated values if needed
    if (onValueChange) {
      onValueChange(updatedOptions);
    }
  }, [localOptions, setValue, onValueChange, onOtherValueChange]);

  // Effect to handle height changes when showOtherInput changes
  useEffect(() => {
    // Notify parent containers about the size change
    if (includeOther) {
      notifyParentOfResize();
    }
  }, [showOtherInput, includeOther]);

  if (customContent) {
    return <>{customContent}</>;
  }

  // Generate CSS grid template columns based on column count
  const gridTemplateColumns = columns > 1 ? `repeat(${columns}, 1fr)` : 'auto';
  
  // Determine layout style based on direction and columns
  const layoutStyle: React.CSSProperties = {
    display: columns === 0 ? 'flex' : 'grid',
    gridTemplateColumns: columns > 0 ? gridTemplateColumns : undefined,
    flexWrap: columns === 0 ? 'wrap' as 'wrap' : undefined,
    gap: '0.5rem',
  };

  // Filter out the "other" option for the main options display
  const mainOptions = localOptions.filter(option => option.value !== 'other');
  const otherOption = localOptions.find(option => option.value === 'other');

  return (
    <div className={width} ref={containerRef}>
      {/* Main options grid/flex layout */}
      <div style={layoutStyle} className="gap-2">
        {mainOptions.map((option) => (
          <div 
            key={option.id} 
            className="flex items-center"
          >
            <input
              type="checkbox"
              id={`${id}-${option.id}`}
              name={`${id}[]`}
              value={option.value}
              checked={option.selected}
              onChange={(e) => handleCheckboxChange(e, option.value)}
              className={checkboxClassName}
            />
            <label
              htmlFor={`${id}-${option.id}`}
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      
      {/* "Other" option - always rendered outside the grid/flex layout */}
      {includeOther && otherOption && (
        <div className="mt-2">
          <div className="flex items-center flex-wrap">
            <div className="flex items-center mr-2">
              <input
                type="checkbox"
                id={`${id}-other`}
                name={`${id}[]`}
                value="other"
                checked={otherOption.selected}
                onChange={(e) => handleCheckboxChange(e, 'other')}
                className={checkboxClassName}
              />
              <label
                htmlFor={`${id}-other`}
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Other
              </label>
            </div>
            
            {/* Always render the input inline */}
            <div className={`flex-1 min-w-[200px] transition-opacity duration-200 ${otherOption.selected ? 'opacity-100' : 'opacity-50'}`}>
              <input
                type="text"
                id={`${id}-other-input`}
                value={otherValue}
                onChange={handleOtherInputChange}
                placeholder={otherPlaceholder}
                disabled={!otherOption.selected}
                className="w-full p-2 text-sm border rounded-md focus:outline-none focus:none border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckboxGroupField;