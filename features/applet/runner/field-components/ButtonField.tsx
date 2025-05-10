// ButtonField.tsx
import React, { useEffect } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, ButtonFieldConfig } from './types';

const ButtonField: React.FC<FieldProps<ButtonFieldConfig>> = ({
  id,
  label,
  placeholder = "Select an option",
  defaultValue,
  onValueChange,
  customConfig = {},
  customContent = null,
  isMobile
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
  
  // Initialize with defaultValue if provided and no currentValue exists
  useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
    }
  }, [defaultValue, currentValue, setValue]);
  
  // Handle selection
  const handleSelect = (value: string) => {
    setValue(value);
    if (onValueChange) {
      onValueChange(value);
    }
  };

  if (customContent) {
    return <>{customContent}</>;
  }

  return (
    <div className={`w-full ${width}`}>
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
  );
};

export default ButtonField;