// CheckboxGroupField.tsx
import React, { useState, useEffect } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps } from './types';

// Define the checkbox option type
export interface CheckboxOption {
  id: string;
  label: string;
  value: string;
  checked?: boolean;
}

// Define the checkbox group config
export interface CheckboxGroupFieldConfig {
  options: CheckboxOption[];
  includeOther?: boolean;
  otherPlaceholder?: string;
  width?: string;
  direction?: 'vertical' | 'horizontal';
  checkboxClassName?: string;
}

const CheckboxGroupField: React.FC<FieldProps<CheckboxGroupFieldConfig>> = ({
  id,
  label,
  defaultValue = [],
  onValueChange,
  customConfig = {},
  customContent = null,
  isMobile = false,
}) => {
  // Extract config options with defaults
  const {
    options = [],
    includeOther = false,
    otherPlaceholder = "Please specify...",
    width = "w-full",
    direction = "vertical",
    checkboxClassName = "rounded-md border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800",
  } = customConfig;

  // Use value broker for managing the selected values
  const { currentValue, setValue } = useValueBroker(id);

  // Track "Other" text input separately
  const [otherValue, setOtherValue] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Initialize with default values
  useEffect(() => {
    if (defaultValue && defaultValue.length > 0 && currentValue === null) {
      const initialValues = Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      
      // Check if "other" is in the default values
      const otherValueIndex = initialValues.findIndex(val => 
        !options.some(opt => opt.value === val) && val !== 'other'
      );
      
      if (otherValueIndex !== -1) {
        setOtherValue(initialValues[otherValueIndex]);
        setShowOtherInput(true);
        
        // Filter out the "other" custom value, but keep the "other" identifier
        const updatedValues = [...initialValues];
        updatedValues.splice(otherValueIndex, 1, 'other');
        setValue(updatedValues);
      } else {
        setValue(initialValues);
        setShowOtherInput(initialValues.includes('other'));
      }
    } else if (currentValue === null) {
      setValue([]);
    } else {
      // If current value already exists, check if "other" is selected
      setShowOtherInput(Array.isArray(currentValue) && currentValue.includes('other'));
    }
  }, [defaultValue, currentValue, setValue, options]);

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, value: string) => {
    const isChecked = e.target.checked;
    
    // Create a new array from current values or initialize if null
    const values = Array.isArray(currentValue) ? [...currentValue] : [];
    
    if (isChecked) {
      // Add the value if it's not already in the array
      if (!values.includes(value)) {
        values.push(value);
      }
      
      // If "other" was checked, show the input
      if (value === 'other') {
        setShowOtherInput(true);
      }
    } else {
      // Remove the value
      const index = values.indexOf(value);
      if (index !== -1) {
        values.splice(index, 1);
      }
      
      // If "other" was unchecked, hide the input
      if (value === 'other') {
        setShowOtherInput(false);
      }
    }
    
    setValue(values);
    
    // Call onValueChange with the updated values
    if (onValueChange) {
      // If "other" is selected and has a value, include the actual value instead of just "other"
      if (showOtherInput && otherValue && values.includes('other')) {
        const processedValues = [...values];
        const otherIndex = processedValues.indexOf('other');
        if (otherIndex !== -1) {
          processedValues.splice(otherIndex, 1, otherValue);
        }
        onValueChange(processedValues);
      } else {
        onValueChange(values);
      }
    }
  };

  // Handle "Other" input change
  const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOtherValue(value);
    
    // Call onValueChange with updated values
    if (onValueChange && Array.isArray(currentValue)) {
      const processedValues = [...currentValue];
      const otherIndex = processedValues.indexOf('other');
      
      if (otherIndex !== -1 && value) {
        processedValues.splice(otherIndex, 1, value);
      } else if (otherIndex !== -1) {
        // If the other input is empty, just keep "other" as a placeholder
        processedValues[otherIndex] = 'other';
      }
      
      onValueChange(processedValues);
    }
  };

  if (customContent) {
    return <>{customContent}</>;
  }

  return (
    <div className={width}>
      {label && (
        <div className="mb-2 font-medium text-gray-800 dark:text-gray-200">{label}</div>
      )}
      
      <div className={`space-y-2 ${direction === 'horizontal' ? 'sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4' : ''}`}>
        {options.map((option) => {
          const isChecked = Array.isArray(currentValue) && currentValue.includes(option.value);
          
          return (
            <div key={option.id} className={`flex items-center ${direction === 'horizontal' ? 'sm:w-auto' : ''}`}>
              <input
                type="checkbox"
                id={`${id}-${option.id}`}
                name={`${id}[]`}
                value={option.value}
                checked={isChecked}
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
          );
        })}
        
        {includeOther && (
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`${id}-other`}
                name={`${id}[]`}
                value="other"
                checked={Array.isArray(currentValue) && currentValue.includes('other')}
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
            
            {showOtherInput && (
              <div className="pl-6">
                <input
                  type="text"
                  id={`${id}-other-input`}
                  value={otherValue}
                  onChange={handleOtherInputChange}
                  placeholder={otherPlaceholder}
                  className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckboxGroupField;