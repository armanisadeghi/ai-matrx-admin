// NumberInputField.tsx
import React, { useEffect } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, InputFieldConfig } from './types';

interface NumberInputFieldConfig extends InputFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  iconSize?: number;
  showLabel?: boolean;
  subtitle?: string;
  helpText?: string;
}

const NumberInputField: React.FC<FieldProps<NumberInputFieldConfig>> = ({
  id,
  label,
  placeholder = "Enter value",
  defaultValue = 0,
  onValueChange,
  customConfig = {},
  customContent = null,
  isMobile
}) => {
  // Extract input config options with defaults
  const {
    min = 0,
    max = Infinity,
    step = 1,
    iconSize = 16,
    width = "w-full",
    showLabel = true,
    subtitle,
    helpText,
  } = customConfig as NumberInputFieldConfig;

  // Use value broker for managing the input value
  const { currentValue, setValue } = useValueBroker(id);
  
  // Initialize with defaultValue if provided and no currentValue exists
  useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
    }
  }, [defaultValue, currentValue, setValue]);
  
  // Make sure we're working with a number
  const numericValue = typeof currentValue === 'number' ? currentValue : 0;

  // Handle increment
  const handleIncrement = () => {
    const newValue = Math.min(numericValue + step, max);
    setValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Handle decrement
  const handleDecrement = () => {
    const newValue = Math.max(numericValue - step, min);
    setValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Determine if buttons should be disabled
  const isDecrementDisabled = numericValue <= min;
  const isIncrementDisabled = numericValue >= max;

  if (customContent) {
    return <>{customContent}</>;
  }

  return (
    <div className={`${width}`}>
      <div className="grid grid-cols-2 items-center py-2">
        {showLabel && (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
            {subtitle && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </span>
            )}
            {helpText && (
              <button className="text-sm text-blue-500 dark:text-blue-400 underline mt-1 text-left">
                {helpText}
              </button>
            )}
          </div>
        )}
        
        <div className={`flex items-center justify-end ${!showLabel ? 'col-span-2' : ''}`}>
          {/* Decrement button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={isDecrementDisabled}
            className={`flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 
              ${isDecrementDisabled 
                ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            aria-label="Decrease value"
          >
            <svg 
              width={iconSize} 
              height={iconSize} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-gray-600 dark:text-gray-300"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          {/* Value display */}
          <div className="w-10 flex items-center justify-center">
            <span className="text-base font-medium text-gray-900 dark:text-gray-100">
              {numericValue}
            </span>
          </div>

          {/* Increment button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={isIncrementDisabled}
            className={`flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 
              ${isIncrementDisabled 
                ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            aria-label="Increase value"
          >
            <svg 
              width={iconSize} 
              height={iconSize} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-gray-600 dark:text-gray-300"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          {/* Hidden input for form submission */}
          <input
            type="hidden"
            id={`${id}-input`}
            name={id}
            value={numericValue}
          />
        </div>
      </div>
    </div>
  );
};

export default NumberInputField;