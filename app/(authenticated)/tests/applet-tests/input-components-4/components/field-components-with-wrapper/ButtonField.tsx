import React, { useState, useEffect } from 'react';
import SearchField from '../SearchField';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, ButtonFieldConfig } from './types';

const ButtonField: React.FC<FieldProps<ButtonFieldConfig>> = ({
  id,
  label,
  placeholder = "Select an option",
  isLast = false,
  actionButton = null,
  defaultValue,
  onValueChange,
  customConfig = {},
  customContent = null
}) => {
  // Extract button config options with defaults
  const {
    values = [],
    title,
    width = "max-w-sm",
    gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    buttonClassName = "py-2 px-3 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-700"
  } = customConfig as ButtonFieldConfig;

  // Use value broker for managing the selected value
  const { currentValue, setValue } = useValueBroker(id);
  
  // UI state
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Initialize with defaultValue if provided and no currentValue exists
  useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
    }
  }, [defaultValue, currentValue, setValue]);
  
  // Display placeholder or selected value
  const displayPlaceholder = currentValue || placeholder;
  
  // Handle field click
  const handleClick = () => {
    setIsActive(true);
  };
  
  // Handle open state change
  const handleOpenChange = (open: boolean) => {
    setIsActive(open);
  };
  
  // Handle selection
  const handleSelect = (value: string) => {
    setValue(value);
    setIsActive(false);
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <SearchField
      id={id}
      label={label}
      placeholder={displayPlaceholder}
      isActive={isActive}
      onClick={() => handleClick()}
      onOpenChange={(open) => handleOpenChange(open)}
      isLast={isLast}
      actionButton={actionButton}
    >
      {customContent ? (
        customContent
      ) : (
        <div className={`p-4 w-full ${width}`}>
          {title && <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">{title}</h3>}
          <div className={`grid ${gridCols} gap-2`}>
            {values.map((value) => (
              <button
                key={`${id}-value-${value}`}
                className={`${buttonClassName} ${currentValue === value ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' : ''}`}
                onClick={() => handleSelect(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
    </SearchField>
  );
};

export default ButtonField;