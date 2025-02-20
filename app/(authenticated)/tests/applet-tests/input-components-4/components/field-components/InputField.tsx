// InputField.tsx
import React, { useEffect } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, InputFieldConfig } from './types';

const InputField: React.FC<FieldProps<InputFieldConfig>> = ({
  id,
  label,
  placeholder = "Enter value",
  defaultValue,
  onValueChange,
  customConfig = {},
  customContent = null
}) => {
  // Extract input config options with defaults
  const {
    type = "text",
    min,
    max,
    step,
    pattern,
    autoComplete,
    width = "w-full max-w-md",
    inputClassName = "w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
  } = customConfig as InputFieldConfig;

  // Use value broker for managing the input value
  const { currentValue, setValue } = useValueBroker(id);
  
  // Initialize with defaultValue if provided and no currentValue exists
  useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
    }
  }, [defaultValue, currentValue, setValue]);
  
  // Handle change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? 
      e.target.valueAsNumber : 
      e.target.value;
      
    setValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  if (customContent) {
    return <>{customContent}</>;
  }

  return (
    <div className={`${width}`}>
      <input
        id={`${id}-input`}
        type={type}
        className={inputClassName}
        value={currentValue ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        pattern={pattern}
        autoComplete={autoComplete}
      />
    </div>
  );
};

export default InputField;