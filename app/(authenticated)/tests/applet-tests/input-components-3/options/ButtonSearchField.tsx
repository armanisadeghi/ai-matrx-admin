import React, { useState, useEffect } from 'react';
import SearchField from '../SearchField';
import { useValueBroker } from '@/hooks/applets/useValueBroker';

// Types for button values
type ButtonValue = string;

// Main component props
interface ButtonSearchFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  title?: string;
  values: ButtonValue[];
  defaultSelected?: ButtonValue; 
  onSelect?: (value: ButtonValue) => void;
  isLast?: boolean;
  actionButton?: React.ReactNode;
  width?: string;
  gridCols?: string;
  buttonClassName?: string;
  customContent?: React.ReactNode;
}

const ButtonSearchField: React.FC<ButtonSearchFieldProps> = ({
  id,
  label,
  placeholder = "Select an option",
  title,
  values,
  defaultSelected,
  onSelect,
  isLast,
  actionButton,
  width = "max-w-sm",
  gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  buttonClassName = "py-2 px-3 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-700",
  customContent
}) => {
  // Use value broker for managing the selected value
  const { currentValue, setValue } = useValueBroker(id);
  
  // Local UI state (not related to the actual value)
  const [isActive, setIsActive] = useState<boolean>(false);
  
  // Initialize with defaultSelected if provided and no currentValue exists
  useEffect(() => {
    // Only set default if we have a defaultSelected and no currentValue yet
    if (defaultSelected && currentValue === null) {
      setValue(defaultSelected);
    }
  }, [defaultSelected, currentValue, setValue]);
  
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
  const handleSelect = (value: ButtonValue) => {
    setValue(value);
    setIsActive(false);
    if (onSelect) {
      onSelect(value);
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

export default ButtonSearchField;