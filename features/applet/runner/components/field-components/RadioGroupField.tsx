// RadioGroupField.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps } from './types';

// Define the radio option type
export interface RadioOption {
  id: string;
  label: string;
  value: string;
  description?: string;
}

// Define the radio group config
export interface RadioGroupFieldConfig {
  options: RadioOption[];
  includeOther?: boolean;
  otherPlaceholder?: string;
  width?: string;
  direction?: 'vertical' | 'horizontal';
  radioClassName?: string;
}

// Extended props interface with optional notification callbacks
interface ExtendedRadioGroupProps extends FieldProps<RadioGroupFieldConfig> {
  onOtherSelected?: (isSelected: boolean, otherValue?: string) => void;
  onOtherValueChange?: (value: string) => void;
}

const RadioGroupField: React.FC<ExtendedRadioGroupProps> = ({
  id,
  label,
  defaultValue = '',
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
    direction = "vertical",
    radioClassName = "border-gray-300 dark:border-gray-600 text-blue-500 focus:none dark:bg-gray-800",
  } = customConfig as RadioGroupFieldConfig;

  // Use value broker for managing the selected value
  const { currentValue, setValue } = useValueBroker(id);

  // Track "Other" text input separately
  const [otherValue, setOtherValue] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  // Initialize with default values
  useEffect(() => {
    if (defaultValue && currentValue === null) {
      // Check if default value is not in options (potentially an "other" value)
      const isOtherDefaultValue = !options.some(opt => opt.value === defaultValue) && defaultValue !== 'other';
      
      if (isOtherDefaultValue) {
        setOtherValue(defaultValue);
        setIsOtherSelected(true);
        setValue('other');
        
        // Notify parent if callback exists
        if (onOtherSelected) {
          onOtherSelected(true, defaultValue);
        }
      } else {
        setValue(defaultValue);
        const isOther = defaultValue === 'other';
        setIsOtherSelected(isOther);
        
        // Notify parent if other is selected and callback exists
        if (isOther && onOtherSelected) {
          onOtherSelected(true);
        }
      }
    } else if (currentValue !== null) {
      const isOther = currentValue === 'other';
      setIsOtherSelected(isOther);
      
      // Notify parent if other is selected and callback exists
      if (isOther && onOtherSelected && !isOtherSelected) {
        onOtherSelected(true, otherValue || undefined);
      }
    }
  }, [defaultValue, currentValue, setValue, options, onOtherSelected, isOtherSelected, otherValue]);

  // Handle radio change
  const handleRadioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue(value);
    
    // Set other selected state
    const isOther = value === 'other';
    const wasOtherSelected = isOtherSelected;
    setIsOtherSelected(isOther);
    
    // Notify parent about other selection change if callback exists
    if (onOtherSelected && wasOtherSelected !== isOther) {
      onOtherSelected(isOther, isOther ? otherValue : undefined);
    }
    
    // Call onValueChange with the actual value
    if (onValueChange) {
      // If "other" is selected and has a value, pass the actual value
      if (isOther && otherValue) {
        onValueChange(otherValue);
      } else {
        onValueChange(value);
      }
    }
  }, [setValue, isOtherSelected, onOtherSelected, otherValue, onValueChange]);

  // Handle "Other" input change
  const handleOtherInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOtherValue(value);
    
    // Notify parent about other value change if callback exists
    if (onOtherValueChange) {
      onOtherValueChange(value);
    }
    
    // Call onValueChange with the actual value
    if (onValueChange && isOtherSelected) {
      onValueChange(value || 'other');
    }
  }, [isOtherSelected, onValueChange, onOtherValueChange]);

  if (customContent) {
    return <>{customContent}</>;
  }

  return (
    <div className={width}>
      {/* Main radio options */}
      <div className={`space-y-2 ${direction === 'horizontal' ? 'sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4' : ''}`}>
        {options.map((option) => (
          <div key={option.id} className={`${direction === 'horizontal' ? 'sm:w-auto' : ''}`}>
            <div className="flex items-center">
              <input
                type="radio"
                id={`${id}-${option.id}`}
                name={id}
                value={option.value}
                checked={currentValue === option.value}
                onChange={handleRadioChange}
                className={radioClassName}
              />
              <label
                htmlFor={`${id}-${option.id}`}
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                {option.label}
              </label>
            </div>
            {option.description && (
              <div className="pl-6 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {option.description}
              </div>
            )}
          </div>
        ))}
      </div>
        
      {/* "Other" option - always rendered outside the main options layout */}
      {includeOther && (
        <div className="mt-2">
          <div className="flex items-center flex-wrap">
            <div className="flex items-center mr-2">
              <input
                type="radio"
                id={`${id}-other`}
                name={id}
                value="other"
                checked={isOtherSelected}
                onChange={handleRadioChange}
                className={radioClassName}
              />
              <label
                htmlFor={`${id}-other`}
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Other
              </label>
            </div>
            
            {/* Always render the input inline */}
            <div className={`flex-1 min-w-[200px] transition-opacity duration-200 ${isOtherSelected ? 'opacity-100' : 'opacity-50'}`}>
              <input
                type="text"
                id={`${id}-other-input`}
                value={otherValue}
                onChange={handleOtherInputChange}
                placeholder={otherPlaceholder}
                disabled={!isOtherSelected}
                className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-none border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                autoFocus={isOtherSelected}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioGroupField;