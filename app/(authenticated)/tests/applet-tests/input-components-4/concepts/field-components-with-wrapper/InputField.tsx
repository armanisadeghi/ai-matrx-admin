import React, { useState } from 'react';
import SearchField from '../../components/search-bar/field/SearchField';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, InputFieldConfig } from './types';

const InputField: React.FC<FieldProps<InputFieldConfig>> = ({
  id,
  label,
  placeholder = "Enter value",
  isLast = false,
  actionButton = null,
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
  
  // UI state
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Initialize with defaultValue if provided and no currentValue exists
  React.useEffect(() => {
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
  
  // Handle field click/focus
  const handleFocus = () => {
    setIsActive(true);
  };
  
  // Handle field blur
  const handleBlur = () => {
    setIsActive(false);
  };

  return (
    <SearchField
      id={id}
      label={label}
      placeholder={placeholder}
      isActive={isActive}
      onClick={() => setIsActive(true)}
      onOpenChange={(open) => setIsActive(open)}
      isLast={isLast}
      actionButton={actionButton}
      preventClose={true}
    >
      {customContent ? (
        customContent
      ) : (
        <div className={`${width}`}>
          <input
            id={`${id}-input`}
            type={type}
            className={inputClassName}
            value={currentValue ?? ''}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            autoComplete={autoComplete}
          />
        </div>
      )}
    </SearchField>
  );
};

export default InputField;